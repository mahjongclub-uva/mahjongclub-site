#!/usr/bin/env python3
"""
Fills the score workbook's Roster tab, once, before check-in goes live.

    python3 pipeline/migrate_roster.py --spreadsheet-id <id>           # dry run
    python3 pipeline/migrate_roster.py --spreadsheet-id <id> --write

Adds every player from pipeline/roster.local.json, keeping their id, display
name and opt-out, then every other name in the Attendance tab as a new player.
Nobody has a computing ID yet: each person links theirs at their first check-in.

Safe to rerun: a name already in the tab (ignoring case and spacing) is left
alone. It prints counts and opaque ids only, never names, and it is the one
script here that writes to the workbook, so it uses its own write-scoped token.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data  # noqa: E402

WRITE_TOKEN = build_data.OAUTH_TOKEN.with_name("google-token-write.json")
WRITE_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"]


def normalize(name: str) -> str:
    return " ".join(name.split()).casefold()


def derive_display(name: str, taken: set[str]) -> str | None:
    """'Kevin Jones' -> 'Kevin J.', extending the surname until it's unused.
    None when even the whole surname is taken, for an officer to settle."""
    parts = name.split()
    if len(parts) == 1:
        return None if parts[0] in taken else parts[0]
    first, last = parts[0], parts[-1]
    for length in range(1, len(last) + 1):
        candidate = f"{first} {last[:length]}."
        if candidate not in taken:
            return candidate
    return None


def plan_rows(
    existing: dict[str, dict], local: dict[str, dict], attendance: list[str]
) -> list[list]:
    """Rows to append, in Roster column order. existing and local map full
    name -> {id, display, opt_out}."""
    seen = {normalize(name) for name in existing}
    taken = {entry["display"] for entry in [*existing.values(), *local.values()]}
    numbers = [int(e["id"][1:]) for e in [*existing.values(), *local.values()]]
    next_number = max(numbers, default=0) + 1
    rows: list[list] = []

    for name, entry in sorted(local.items(), key=lambda kv: kv[1]["id"]):
        if normalize(name) in seen:
            continue
        seen.add(normalize(name))
        rows.append([entry["id"], "", name, entry["display"], bool(entry["opt_out"])])

    for name in attendance:
        name = " ".join(name.split())
        if not name or normalize(name) in seen:
            continue
        seen.add(normalize(name))
        display = derive_display(name, taken) or f"CHECK p{next_number:03d}"
        taken.add(display)
        # Attendance alone publishes nothing. Playing a scored table is consent,
        # the same as for anyone who signs up at check-in.
        rows.append([f"p{next_number:03d}", "", name, display, False])
        next_number += 1
    return rows


def likely_duplicates(names_to_ids: dict[str, str]) -> list[tuple[str, str]]:
    """Pairs sharing a surname where one first name starts the other
    ('Ben Liu' and 'Benjamin Liu'), for an officer to check by eye."""
    split = [(n.split()[0].casefold(), n.split()[-1].casefold(), i)
             for n, i in names_to_ids.items() if len(n.split()) > 1]
    pairs = []
    for index, (first_a, last_a, id_a) in enumerate(split):
        for first_b, last_b, id_b in split[index + 1:]:
            if last_a == last_b and (first_a.startswith(first_b) or first_b.startswith(first_a)):
                pairs.append(tuple(sorted((id_a, id_b))))
    return sorted(pairs)


def sheets_client(write: bool):
    """Read-only unless writing, so a dry run never asks for write access."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    token, scope = (WRITE_TOKEN, WRITE_SCOPE) if write else (build_data.OAUTH_TOKEN, build_data.SHEETS_SCOPE)
    credentials = None
    if token.exists():
        credentials = Credentials.from_authorized_user_file(token, scope)
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            credentials = InstalledAppFlow.from_client_secrets_file(
                build_data.OAUTH_CLIENT, scope
            ).run_local_server(port=0)
        token.write_text(credentials.to_json(), encoding="utf-8")
        token.chmod(0o600)
    return build("sheets", "v4", credentials=credentials, cache_discovery=False).spreadsheets()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spreadsheet-id", default=os.environ.get("SCORES_SPREADSHEET_ID"))
    parser.add_argument("--attendance-tab", default="Fall Attendance")
    parser.add_argument("--write", action="store_true", help="change the workbook")
    args = parser.parse_args()
    if not args.spreadsheet_id:
        build_data.die("pass --spreadsheet-id or set SCORES_SPREADSHEET_ID")

    tabs = [s["properties"]["title"] for s in sheets_client(write=False).get(
        spreadsheetId=args.spreadsheet_id, fields="sheets.properties.title").execute()["sheets"]]
    has_tab = build_data.ROSTER_TAB in tabs

    existing = (
        build_data.roster_from_grid(build_data.read_sheets_grid(
            args.spreadsheet_id, build_data.ROSTER_TAB, "A:E"))
        if has_tab else {}
    )
    local = json.loads(build_data.ROSTER_PATH.read_text())["players"] if build_data.ROSTER_PATH.exists() else {}
    attendance_grid = build_data.read_sheets_grid(args.spreadsheet_id, args.attendance_tab, "A:A")
    attendance = [text for (row, _), text in sorted(attendance_grid.items()) if row >= 3]

    rows = plan_rows(existing, local, attendance)
    from_local = sum(1 for row in rows if row[2] in local)
    everyone = {**{n: e["id"] for n, e in existing.items()}, **{row[2]: row[0] for row in rows}}

    print(f"Roster tab: {'exists, ' + str(len(existing)) + ' players' if has_tab else 'not created yet'}")
    print(f"To add: {from_local} from roster.local.json, {len(rows) - from_local} from {args.attendance_tab}")
    for row in rows:
        if row[3].startswith("CHECK"):
            print(f"  {row[0]} needs a display name set by hand (short name already taken)")
    for a, b in likely_duplicates(everyone):
        print(f"  {a} and {b} may be the same person (same surname, similar first name)")

    if not args.write:
        print("\nDry run. Nothing changed. Add --write to apply.")
        return

    sheets = sheets_client(write=True)
    if not has_tab:
        sheets.batchUpdate(spreadsheetId=args.spreadsheet_id, body={"requests": [
            {"addSheet": {"properties": {"title": build_data.ROSTER_TAB,
                                         "gridProperties": {"frozenRowCount": 1}}}}]}).execute()
        sheets.values().update(
            spreadsheetId=args.spreadsheet_id, range=f"'{build_data.ROSTER_TAB}'!A1",
            valueInputOption="RAW", body={"values": [build_data.ROSTER_COLUMNS]}).execute()
    if rows:
        sheets.values().append(
            spreadsheetId=args.spreadsheet_id, range=f"'{build_data.ROSTER_TAB}'!A:E",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": rows}).execute()
        # Checkboxes only on filled rows, and only after writing them: an empty
        # checkbox holds FALSE, so checkboxes on blank rows would make the next
        # append land below them.
        tab_id = next(s["properties"]["sheetId"] for s in sheets.get(
            spreadsheetId=args.spreadsheet_id, fields="sheets.properties").execute()["sheets"]
            if s["properties"]["title"] == build_data.ROSTER_TAB)
        sheets.batchUpdate(spreadsheetId=args.spreadsheet_id, body={"requests": [
            {"setDataValidation": {
                "range": {"sheetId": tab_id, "startRowIndex": 1, "endRowIndex": 1 + len(existing) + len(rows),
                          "startColumnIndex": 4, "endColumnIndex": 5},
                "rule": {"condition": {"type": "BOOLEAN"}}}}]}).execute()
    print(f"\nWrote {len(rows)} row(s) to {build_data.ROSTER_TAB}.")


if __name__ == "__main__":
    main()
