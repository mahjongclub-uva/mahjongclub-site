#!/usr/bin/env python3
"""
Turns the club's score sheet into the JSON the website reads.

    python3 pipeline/build_data.py

Reads the Points Tracking tab, checks every table adds up, works out the
standings, and writes data/meta.json and data/semesters/*.json.

Never writes to the sheet (read-only), and never publishes a legal name.
Legal names live only in the workbook's Roster tab; only short display
names like "Eddie Z." reach the website.

If a table's points don't add up, this stops with an error naming the table
and writes nothing, so the site keeps showing the last good (stale but
correct) data instead of something wrong.

It reads the Google Sheet with the packages in requirements.txt.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import datetime as dt
from decimal import Decimal, InvalidOperation
from pathlib import Path


# ---------------------------------------------------------------------------
# Configuration. Almost everything you would want to change lives here.
# ---------------------------------------------------------------------------

PIPELINE_VERSION = "0.1.0"

OAUTH_CLIENT = Path.home() / ".config" / "mahjongclub-site" / "google-oauth-client.json"
OAUTH_TOKEN = Path.home() / ".config" / "mahjongclub-site" / "google-token.json"
SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

# Each semester has its own source tab and qualification rule. Import one
# semester at a time so a new private Sheet need not contain older seasons.
SEMESTERS = [
    {
        "id": "fall-2026",
        "label": "Fall 2026",
        "tab": "Fall Points Tracking",
        "min_tables": 1,
        "scoring_rule": "season-net",
    },
]

# The semester the site opens on. Set this by hand. Never derive it from
# today's date, or a visitor in July lands on an empty page.
CURRENT_SEMESTER = "fall-2026"

# Each player starts a table with this many points, so a table always has
# 4 x 205 = 820 points on it and one player's win is another's loss.
START_AMOUNT = 205
SEATS_PER_TABLE = 4

REPO = Path(__file__).resolve().parent.parent
DATA_DIR = REPO / "data"


# ---------------------------------------------------------------------------
# Reading source data.
# ---------------------------------------------------------------------------

def read_sheets_grid(
    spreadsheet_id: str, tab: str, columns: str = "B:F"
) -> dict[tuple[int, int], str]:
    """Read some columns of one private Google Sheet tab using local OAuth."""
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError:
        die("install the Sheets API packages with: python3 -m pip install -r pipeline/requirements.txt")

    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        from google.auth import default

        credentials, _ = default(scopes=SHEETS_SCOPE)
    else:
        credentials = None
        if OAUTH_TOKEN.exists():
            credentials = Credentials.from_authorized_user_file(OAUTH_TOKEN, SHEETS_SCOPE)

        if not credentials or not credentials.valid:
            if credentials and credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
            else:
                if not OAUTH_CLIENT.exists():
                    die(f"download a Desktop OAuth client and save it to {OAUTH_CLIENT}")
                credentials = InstalledAppFlow.from_client_secrets_file(
                    OAUTH_CLIENT, SHEETS_SCOPE
                ).run_local_server(port=0)
            OAUTH_TOKEN.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            OAUTH_TOKEN.parent.chmod(0o700)
            OAUTH_TOKEN.write_text(credentials.to_json(), encoding="utf-8")
            OAUTH_TOKEN.chmod(0o600)

    try:
        service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
        result = (
            service.spreadsheets()
            .values()
            .get(
                spreadsheetId=spreadsheet_id,
                range=f"'{tab}'!{columns}",
                valueRenderOption="UNFORMATTED_VALUE",
                dateTimeRenderOption="SERIAL_NUMBER",
            )
            # The client retries timeouts and server errors with backoff.
            .execute(num_retries=3)
        )
    except Exception as error:
        die(f"could not read the configured private spreadsheet ({type(error).__name__}); check access, spreadsheet ID, and tab name")

    first_column = cell_ref(columns.split(":")[0] + "1")[1]
    grid: dict[tuple[int, int], str] = {}
    for row_number, row in enumerate(result.get("values", []), start=1):
        for offset, value in enumerate(row):
            if value not in (None, ""):
                grid[row_number, offset + first_column] = str(value)
    return grid


def cell_ref(ref: str) -> tuple[int, int]:
    """'C14' -> (14, 3)."""
    letters, digits = re.match(r"([A-Z]+)(\d+)", ref).groups()
    column = 0
    for letter in letters:
        column = column * 26 + (ord(letter) - 64)
    return int(digits), column


def parse_date(serial: str | None) -> str | None:
    """Column E holds a date as days since 1899-12-30; return it as
    YYYY-MM-DD. Blank, or the sheet's "enter date" placeholder, means nobody
    filled it in yet."""
    if not serial:
        return None
    try:
        days = int(float(serial))
    except ValueError:
        return None
    return (dt.date(1899, 12, 30) + dt.timedelta(days=days)).isoformat()


# ---------------------------------------------------------------------------
# Understanding the layout.
#
# The Points Tracking tab is a stack of blocks in columns B to F:
#
#     B            C        D      E      F
#     Table 3                             12 games  <- block starts; F is
#                                                      how many games it ran
#     Player       Points   Net    <date> <- the session date lives here
#     Kevin Jiang  154      -51
#     Loy Luo      178      -27
#     Bailee Ng    190      -15
#     Yongnian     298       93
#     (blank row)
#
# Blocks with no players are blank templates and are skipped. Columns to the
# right hold the secretary's own summaries, deliberately ignored: everything
# here is recomputed from the tables above, so a broken formula over there
# can't reach the website.
# ---------------------------------------------------------------------------

COL_NAME, COL_POINTS, COL_NET, COL_DATE, COL_GAMES = 2, 3, 4, 5, 6


class Table:
    def __init__(self, number: int, date: str | None, games: int | None = None):
        self.number = number
        self.date = date
        # None when nobody counted: tables typed in by hand, or from before
        # the table pages wrote it.
        self.games = games
        self.seats: list[tuple[str, int, int]] = []  # (name, points, net)

    def __repr__(self) -> str:
        return f"Table {self.number}"


def parse_tables(grid: dict[tuple[int, int], str]) -> list[Table]:
    if not grid:
        return []
    last_row = max(row for row, _ in grid)
    tables: list[Table] = []
    current: Table | None = None

    for row in range(1, last_row + 1):
        label = grid.get((row, COL_NAME), "")

        heading = re.fullmatch(r"Table (\d+)", label)
        if heading:
            games = grid.get((row, COL_GAMES))
            if games is not None and not re.fullmatch(r"[1-9]\d*(\.0+)?", games):
                die(f"Table {heading.group(1)} needs a whole number of games in column F")
            current = Table(int(heading.group(1)), None, games and int(float(games)))
            tables.append(current)
            continue

        if current is None:
            continue

        # The header row of a block carries that session's date in column E.
        if label == "Player":
            current.date = parse_date(grid.get((row, COL_DATE)))
            continue

        points, net = grid.get((row, COL_POINTS)), grid.get((row, COL_NET))
        if label and points is not None and net is not None:
            try:
                scores = [Decimal(value) for value in (points, net)]
                if any(not value.is_finite() or value != value.to_integral_value() for value in scores):
                    raise ValueError
            except (InvalidOperation, ValueError):
                die(f"{current} row {row} requires whole-number points and net")
            current.seats.append((label, int(scores[0]), int(scores[1])))

    return [t for t in tables if t.seats]


def check_tables(tables: list[Table]) -> None:
    """Collect every problem, then report them together so one pass fixes
    all. Points that don't add up are fatal (a mistyped result poisons every
    downstream number). A missing date is only a warning: the date is used
    for the session count and dating an award, not the standings, so an
    undated table still counts toward standings but adds no session rather
    than being dropped and quietly taking real results off real people."""
    problems: list[str] = []
    warnings: list[str] = []

    for table in tables:
        if table.date is None:
            warnings.append(
                f"{table} has no date in column E, so it counts toward the "
                "standings but not toward the session count."
            )

        if len(table.seats) != SEATS_PER_TABLE:
            problems.append(f"{table} has {len(table.seats)} players, expected {SEATS_PER_TABLE}")

        total = sum(points for _, points, _ in table.seats)
        expected = START_AMOUNT * len(table.seats)
        if total != expected:
            problems.append(f"{table} points add up to {total}, expected {expected}")

        for _, points, net in table.seats:
            if net != points - START_AMOUNT:
                problems.append(
                    f"{table} has {points} points and net {net}, "
                    f"but {points} - {START_AMOUNT} is {points - START_AMOUNT}"
                )

        seen = [name for name, _, _ in table.seats]
        if len(set(seen)) != len(seen):
            problems.append(f"{table} lists the same player twice")

    if problems:
        die(
            "the sheet needs fixing before the site can be rebuilt:\n\n  - "
            + "\n  - ".join(problems)
            + "\n\nNothing was written. The site keeps showing the last good data."
        )

    for warning in warnings:
        print(f"  warning: {warning}")


# ---------------------------------------------------------------------------
# The roster: maps each sheet name to the id and display name the website
# uses. Not committed, since it's the one place legal and short names sit
# side by side.
#
#   "id"       assigned once, never reused, so a player keeps it across builds.
#   "display"  what the website shows, default first name + last initial.
#              Change for a nickname or to tell two people apart.
#   "opt_out"  true removes the player entirely; ranks are computed after
#              removal so the list has no gaps and nobody can tell who left.
# ---------------------------------------------------------------------------


# The Roster tab in the score workbook. Row 1 is this header; full_name is spelled exactly as in
# Points Tracking. The pipeline only reads it: new rows come from check-in
# sign-up or pipeline/migrate_roster.py.
ROSTER_TAB = "Roster"
ROSTER_COLUMNS = ["player_id", "computing_id", "full_name", "display", "opt_out"]


def roster_from_grid(grid: dict[tuple[int, int], str]) -> dict[str, dict]:
    header = [grid.get((1, column), "") for column in range(1, len(ROSTER_COLUMNS) + 1)]
    if header != ROSTER_COLUMNS:
        die(f"the {ROSTER_TAB} tab's first row must be: {', '.join(ROSTER_COLUMNS)}")
    last_row = max((row for row, _ in grid), default=1)
    roster: dict[str, dict] = {}
    for row in range(2, last_row + 1):
        player_id, _, name, display, opt_out = (
            grid.get((row, column), "").strip() for column in range(1, 6)
        )
        if not name:
            continue
        if not re.fullmatch(r"p\d{3,}", player_id) or not display:
            die(f"{ROSTER_TAB} row {row} needs a player_id like p014 and a display name")
        if name in roster:
            die(f"{ROSTER_TAB} row {row} repeats a full name already listed above")
        roster[name] = {
            "id": player_id,
            "display": display,
            "opt_out": opt_out.lower() in {"true", "1", "yes"},
        }
    ids = [entry["id"] for entry in roster.values()]
    if len(set(ids)) != len(ids):
        die(f"the {ROSTER_TAB} tab uses a player_id twice")
    return roster


def read_roster_tab(spreadsheet_id: str, names: list[str]) -> dict[str, dict]:
    roster = roster_from_grid(read_sheets_grid(spreadsheet_id, ROSTER_TAB, "A:E"))
    missing = [name for name in names if name not in roster]
    if missing:
        die(
            f"the {ROSTER_TAB} tab is missing {len(missing)} player(s) who appear in "
            "Points Tracking; add them (python3 pipeline/migrate_roster.py) and rerun"
        )
    return roster


# ---------------------------------------------------------------------------
# Standings. "net" is a table result minus the 205 starting points (can be
# negative). Fall 2026 ranks by cumulative net, with 205 added only once when
# displayed. Older data retains its positive-gain ranking until revisited.
# ---------------------------------------------------------------------------


def round1(value: float) -> float:
    return round(value, 1)


def aggregate(
    tables: list[Table], roster: dict[str, dict], min_tables: int = 2,
    scoring_rule: str | None = None,
) -> tuple[list[dict], list[dict]]:
    totals: dict[str, dict] = {}

    for table in tables:
        for name, _points, net in table.seats:
            if roster[name]["opt_out"]:
                continue
            player = totals.setdefault(
                name,
                {"gain": 0, "net": 0, "tables": 0, "best": None, "games": 0},
            )
            player["games"] += table.games or 0
            player["gain"] += max(net, 0)
            player["net"] += net
            player["tables"] += 1
            player["best"] = net if player["best"] is None else max(player["best"], net)

    ranked = sorted(
        (
            (name, totals[name])
            for name in totals
            if totals[name]["tables"] >= min_tables
        ),
        key=(
            (lambda item: (-item[1]["net"], item[1]["tables"]))
            if scoring_rule == "season-net"
            else (lambda item: (-item[1]["gain"], item[1]["tables"], -item[1]["net"]))
        ),
    )

    standings = []
    for position, (name, player) in enumerate(ranked):
        if position == 0:
            rank = 1
        else:
            previous = ranked[position - 1][1]
            same = (
                previous["net"] == player["net"]
                and previous["tables"] == player["tables"]
            )
            if scoring_rule != "season-net":
                same = same and previous["gain"] == player["gain"]
            rank = standings[-1]["rank"] if same else standings[-1]["rank"] + 1

        standings.append(
            {
                "id": roster[name]["id"],
                "rank": rank,
                "display": roster[name]["display"],
                "tables_played": player["tables"],
                "total_gain": player["gain"],
                "avg_gain": round1(player["gain"] / player["tables"]),
                "best_table": player["best"],
                "total_net": player["net"],
                "avg_net": round1(player["net"] / player["tables"]),
            }
        )
        # Games are counted from when the table pages started writing them,
        # so this is left out until a player has some.
        if player["games"]:
            standings[-1]["games_played"] = player["games"]

    unranked = sorted(
        (
            {
                "id": roster[name]["id"],
                "display": roster[name]["display"],
                "tables_played": player["tables"],
                "tables_needed": min_tables - player["tables"],
            }
            for name, player in totals.items()
            if player["tables"] < min_tables
        ),
        key=lambda p: (-p["tables_played"], p["display"]),
    )

    return standings, unranked


def add_rank_changes(
    standings: list[dict], tables: list[Table], roster: dict[str, dict], min_tables: int
) -> None:
    """Places each player moved at the latest session: positive is up, None is
    new to the board. Undated tables count on both boards, so they move no one."""
    dates = sorted({table.date for table in tables if table.date})
    if not dates:
        return
    before, _ = aggregate(
        [table for table in tables if table.date != dates[-1]],
        roster, min_tables, "season-net",
    )
    previous = {player["id"]: player["rank"] for player in before}
    for player in standings:
        player["rank_change"] = (
            previous[player["id"]] - player["rank"] if player["id"] in previous else None
        )


def build_awards(tables: list[Table], roster: dict[str, dict]) -> list[dict]:
    """Awards use raw net, not gain (a win is a win regardless of ranking),
    and ignore the minimum-tables threshold. No winner means the award is
    left out entirely, never rendered empty."""
    awards = []

    best = None
    for table in tables:
        for name, _points, net in table.seats:
            if roster[name]["opt_out"]:
                continue
            if best is None or net > best[1]:
                best = (name, net, table.date)
    if best and best[1] > 0:
        awards.append(
            {
                "id": "biggest-win",
                "label": "Biggest single table",
                "display": roster[best[0]]["display"],
                "value": best[1],
                "unit": "points",
                "detail": best[2],
            }
        )

    return awards


# ---------------------------------------------------------------------------
# Writing the files.
# ---------------------------------------------------------------------------


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"  wrote {path.relative_to(REPO)}")


def die(message: str) -> None:
    print(f"\nbuild_data.py: {message}\n", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    # Sheets is the only source; the flag stays so existing callers still work.
    parser.add_argument("--source", choices=("sheets",), default="sheets")
    parser.add_argument("--spreadsheet-id", default=None)
    parser.add_argument(
        "--semester", choices=[s["id"] for s in SEMESTERS], default=CURRENT_SEMESTER
    )
    args = parser.parse_args()

    spreadsheet_id = args.spreadsheet_id or os.environ.get("SCORES_SPREADSHEET_ID")
    if not spreadsheet_id:
        die("pass --spreadsheet-id or set SCORES_SPREADSHEET_ID")
    print("Reading the private Google Sheet")

    config = next(s for s in SEMESTERS if s["id"] == args.semester)
    summaries = []
    grid = read_sheets_grid(spreadsheet_id, config["tab"])
    tables = parse_tables(grid)
    if not tables:
        print(f"  {config['label']}: no tables played yet")

    check_tables(tables)

    names = sorted({name for table in tables for name, _, _ in table.seats})
    roster = read_roster_tab(spreadsheet_id, names)

    standings, unranked = aggregate(
        tables, roster, config["min_tables"], config.get("scoring_rule")
    )
    if config.get("scoring_rule") == "season-net":
        add_rank_changes(standings, tables, roster, config["min_tables"])
    # Only tables with a date count as a session. An undated table still
    # counts toward the standings; see check_tables.
    dates = sorted({table.date for table in tables if table.date})

    semester_data = {
        "schema_version": 1,
        "id": config["id"],
        "label": config["label"],
        "sessions": len(dates),
        "last_session": dates[-1] if dates else None,
        "min_tables_to_rank": config["min_tables"],
        "standings": standings,
        "unranked": unranked,
        "awards": build_awards(tables, roster),
    }
    if config.get("scoring_rule"):
        semester_data["scoring_rule"] = config["scoring_rule"]
    write_json(
        DATA_DIR / "semesters" / f"{config['id']}.json",
        semester_data,
    )

    summaries.append({"id": config["id"]})

    print(
        f"  {config['label']}: {len(tables)} tables over {len(dates)} sessions, "
        f"{len(standings)} ranked, {len(unranked)} not yet ranked"
    )

    for other in SEMESTERS:
        if other["id"] == config["id"]:
            continue
        if (DATA_DIR / "semesters" / f"{other['id']}.json").exists():
            summaries.append({"id": other["id"]})

    # meta.json lists semesters newest first; the site renders them in order.
    summaries.sort(key=lambda s: s["id"], reverse=True)

    write_json(
        DATA_DIR / "meta.json",
        {
            "schema_version": 1,
            "generated_at": dt.datetime.now(dt.timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "pipeline_version": PIPELINE_VERSION,
            "current_semester": CURRENT_SEMESTER,
            "semesters": summaries,
        },
    )

    print("\nDone. Check the site with: npm run dev")


if __name__ == "__main__":
    main()
