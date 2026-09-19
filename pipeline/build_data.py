#!/usr/bin/env python3
"""
Turns the club's score sheet into the JSON the website reads.

    python3 pipeline/build_data.py

Reads the Points Tracking tab, checks every table adds up, works out the
standings, and writes data/meta.json and data/semesters/*.json.

Never writes to the sheet (read-only), and never publishes a legal name
(those live in pipeline/roster.local.json, not committed; only short display
names like "Eddie Z." reach the website).

If a table's points don't add up, this stops with an error naming the table
and writes nothing, so the site keeps showing the last good (stale but
correct) data instead of something wrong.

Only stdlib is used, so there is nothing to install.
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
import datetime as dt
import xml.etree.ElementTree as ET
from pathlib import Path


# ---------------------------------------------------------------------------
# Configuration. Almost everything you would want to change lives here.
# ---------------------------------------------------------------------------

PIPELINE_VERSION = "0.1.0"

# Downloaded copy of the Google Sheet; see "Swapping in the Google Sheets
# API" at the bottom of this file.
WORKBOOK = Path.home() / "Documents" / "mahjongclub" / "Copy of ATTENDANCE 25-26.xlsx"

# Every semester the site publishes, newest last. Adding next semester is a
# change to this list and nothing else.
SEMESTERS = [
    {"id": "fall-2025", "label": "Fall 2025", "tab": "Fall Points Tracking"},
]

# The semester the site opens on. Set this by hand. Never derive it from
# today's date, or a visitor in July lands on an empty page.
CURRENT_SEMESTER = "fall-2025"

# Each player starts a table with this many points, so a table always has
# 4 x 205 = 820 points on it and one player's win is another's loss.
START_AMOUNT = 205
SEATS_PER_TABLE = 4

# How many tables you must play to appear in the ranked standings.
# This number is also pinned in src/lib/schema.ts. Change both together.
MIN_TABLES_TO_RANK = 2

REPO = Path(__file__).resolve().parent.parent
ROSTER_PATH = REPO / "pipeline" / "roster.local.json"
DATA_DIR = REPO / "data"


# ---------------------------------------------------------------------------
# Reading the workbook. Temporary, until the Google Sheets credential lands;
# only this section gets replaced then, everything below works on parsed
# tables and doesn't care where they came from.
# ---------------------------------------------------------------------------

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def read_grid(workbook: Path, tab: str) -> dict[tuple[int, int], str]:
    """Return one tab as {(row, column): text}, both 1-based. Blanks are absent."""
    if not workbook.exists():
        die(f"cannot find the workbook at {workbook}")

    archive = zipfile.ZipFile(workbook)

    # Cell text is pooled in one shared table and referenced by index.
    shared: list[str] = []
    if "xl/sharedStrings.xml" in archive.namelist():
        for entry in ET.fromstring(archive.read("xl/sharedStrings.xml")):
            shared.append("".join(t.text or "" for t in entry.iter(_NS + "t")))

    targets = {
        rel.get("Id"): rel.get("Target").lstrip("/")
        for rel in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    }

    path = None
    tabs = []
    for sheet in ET.fromstring(archive.read("xl/workbook.xml")).iter(_NS + "sheet"):
        tabs.append(sheet.get("name"))
        if sheet.get("name") == tab:
            path = targets[sheet.get(_REL + "id")]
    if path is None:
        die(f"no tab named {tab!r}. The workbook has: {', '.join(tabs)}")
    if not path.startswith("xl/"):
        path = "xl/" + path

    grid: dict[tuple[int, int], str] = {}
    for cell in ET.fromstring(archive.read(path)).iter(_NS + "c"):
        value = cell.find(_NS + "v")
        if value is None or value.text is None:
            continue
        text = shared[int(value.text)] if cell.get("t") == "s" else value.text
        if text.strip():
            grid[cell_ref(cell.get("r"))] = text.strip()
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
# The Points Tracking tab is a stack of blocks in columns B to E:
#
#     B            C        D      E
#     Table 3                             <- block starts
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

COL_NAME, COL_POINTS, COL_NET, COL_DATE = 2, 3, 4, 5


class Table:
    def __init__(self, number: int, date: str | None):
        self.number = number
        self.date = date
        self.seats: list[tuple[str, int, int]] = []  # (name, points, net)

    def __repr__(self) -> str:
        return f"Table {self.number}"


def parse_tables(grid: dict[tuple[int, int], str]) -> list[Table]:
    last_row = max(row for row, _ in grid)
    tables: list[Table] = []
    current: Table | None = None

    for row in range(1, last_row + 1):
        label = grid.get((row, COL_NAME), "")

        heading = re.fullmatch(r"Table (\d+)", label)
        if heading:
            current = Table(int(heading.group(1)), None)
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
            current.seats.append((label, int(float(points)), int(float(net))))

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
                "standings but not toward the session count. Players: "
                + ", ".join(name for name, _, _ in table.seats)
            )

        if len(table.seats) != SEATS_PER_TABLE:
            problems.append(f"{table} has {len(table.seats)} players, expected {SEATS_PER_TABLE}")

        total = sum(points for _, points, _ in table.seats)
        expected = START_AMOUNT * len(table.seats)
        if total != expected:
            problems.append(f"{table} points add up to {total}, expected {expected}")

        for name, points, net in table.seats:
            if net != points - START_AMOUNT:
                problems.append(
                    f"{table}: {name} has {points} points and net {net}, "
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


def default_display(name: str) -> str:
    parts = name.split()
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


def load_roster(names: list[str]) -> dict[str, dict]:
    roster: dict[str, dict] = {}
    if ROSTER_PATH.exists():
        roster = json.loads(ROSTER_PATH.read_text())["players"]

    used = {entry["id"] for entry in roster.values()}
    added = []
    for name in names:
        if name in roster:
            continue
        number = 1
        while f"p{number:03d}" in used:
            number += 1
        new_id = f"p{number:03d}"
        used.add(new_id)
        roster[name] = {"id": new_id, "display": default_display(name), "opt_out": False}
        added.append(f"{new_id} {roster[name]['display']}")

    ROSTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    ROSTER_PATH.write_text(
        json.dumps(
            {
                "_comment": "Not committed: this file maps real names to site names. "
                            "Edit 'display' for a nickname, set 'opt_out' to remove someone.",
                "players": dict(sorted(roster.items(), key=lambda kv: kv[1]["id"])),
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )

    if added:
        print(f"  added {len(added)} player(s) to the roster: {', '.join(added)}")
    return roster


# ---------------------------------------------------------------------------
# Standings. "net" is a table result minus the 205 starting points (can be
# negative). "gain" is the same with losses floored at zero, so playing more
# and losing never costs position. Rank order: most gain, then fewest tables
# to get it, then best net; ties only when all three match.
# ---------------------------------------------------------------------------


def round1(value: float) -> float:
    return round(value, 1)


def aggregate(tables: list[Table], roster: dict[str, dict]) -> tuple[list[dict], list[dict]]:
    totals: dict[str, dict] = {}

    for table in tables:
        for name, _points, net in table.seats:
            if roster[name]["opt_out"]:
                continue
            player = totals.setdefault(
                name, {"gain": 0, "net": 0, "tables": 0, "best": None}
            )
            player["gain"] += max(net, 0)
            player["net"] += net
            player["tables"] += 1
            player["best"] = net if player["best"] is None else max(player["best"], net)

    ranked = sorted(
        (
            (name, totals[name])
            for name in totals
            if totals[name]["tables"] >= MIN_TABLES_TO_RANK
        ),
        key=lambda item: (-item[1]["gain"], item[1]["tables"], -item[1]["net"]),
    )

    standings = []
    for position, (name, player) in enumerate(ranked):
        if position == 0:
            rank = 1
        else:
            previous = ranked[position - 1][1]
            same = (
                previous["gain"] == player["gain"]
                and previous["tables"] == player["tables"]
                and previous["net"] == player["net"]
            )
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

    unranked = sorted(
        (
            {
                "id": roster[name]["id"],
                "display": roster[name]["display"],
                "tables_played": player["tables"],
                "tables_needed": MIN_TABLES_TO_RANK - player["tables"],
            }
            for name, player in totals.items()
            if player["tables"] < MIN_TABLES_TO_RANK
        ),
        key=lambda p: (-p["tables_played"], p["display"]),
    )

    return standings, unranked


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
    print(f"Reading {WORKBOOK.name}")

    summaries = []
    for config in SEMESTERS:
        tables = parse_tables(read_grid(WORKBOOK, config["tab"]))
        if not tables:
            print(f"  {config['label']}: no tables played yet")

        check_tables(tables)

        names = sorted({name for table in tables for name, _, _ in table.seats})
        roster = load_roster(names)

        standings, unranked = aggregate(tables, roster)
        # Only tables with a date count as a session. An undated table still
        # counts toward the standings; see check_tables.
        dates = sorted({table.date for table in tables if table.date})

        write_json(
            DATA_DIR / "semesters" / f"{config['id']}.json",
            {
                "schema_version": 1,
                "id": config["id"],
                "label": config["label"],
                "sessions": len(dates),
                "last_session": dates[-1] if dates else None,
                "min_tables_to_rank": MIN_TABLES_TO_RANK,
                "standings": standings,
                "unranked": unranked,
                "awards": build_awards(tables, roster),
            },
        )

        summaries.append(
            {
                "id": config["id"],
                "label": config["label"],
                "sessions": len(dates),
                "last_session": dates[-1] if dates else None,
            }
        )

        print(
            f"  {config['label']}: {len(tables)} tables over {len(dates)} sessions, "
            f"{len(standings)} ranked, {len(unranked)} not yet ranked"
        )

    # meta.json lists semesters newest first; the site renders them in order.
    summaries.reverse()

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


# ---------------------------------------------------------------------------
# Swapping in the Google Sheets API: replace `read_grid` with a version that
# calls the Sheets API with a read-only service account and returns the same
# {(row, column): text} dict. Nothing else here needs to change.
#
# Read "Scores: reading the sheet" in README.md before starting. The short
# version: it costs the stdlib-only promise (a private sheet needs a service
# account, which needs RSA signing, which needs google-auth) and a credential
# to look after, and it still cannot run in CI. Do it for the roster, which
# currently lives on one laptop and takes every player id with it if that
# laptop dies. Skipping the manual download is not on its own worth it.
# ---------------------------------------------------------------------------
