#!/usr/bin/env python3
"""
Turns the club's public Google Calendar into the JSON the website reads.

    python3 pipeline/build_meetings.py

The site is a static export with no server to ask "when's the next meeting?"
at visit time, so this asks at build time instead: reads the calendar's
public iCal feed, works out the next few meetings, writes data/meetings.json.
A weekly GitHub Action re-runs and redeploys, which is the whole accuracy
story, a meeting cancelled Thursday stays on the site until the next run, so
cancel by removing the event (and say so on Instagram if it matters).

The event's Location is published as typed, so keep it to a building and
room, never anything that reads as a person's whereabouts.

Only stdlib is used, so there is nothing to install.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
import datetime as dt
from pathlib import Path
from zoneinfo import ZoneInfo


# ---------------------------------------------------------------------------
# Configuration.
# ---------------------------------------------------------------------------

# The calendar's public iCal address. Google Calendar shows it under
# Settings -> your calendar -> Integrate calendar, as "Public address in iCal
# format". The calendar has to be public or this returns a 404.
ICAL_URL = (
    "https://calendar.google.com/calendar/ical/"
    "c2b93807305215ee07bdbd6d1c045e8f58588b299afa24dd14fa981830eb3c2a"
    "%40group.calendar.google.com/public/basic.ics"
)

# Everything on this calendar is in local time, and a visitor reading the site
# is on Grounds.
CLUB_TZ = ZoneInfo("America/New_York")

# More than one on purpose: if a weekly run is missed, the site can still
# skip past an already-happened meeting and name a real one, not a stale one.
HORIZON = 6

OUT = Path(__file__).resolve().parent.parent / "data" / "meetings.json"


# ---------------------------------------------------------------------------
# iCalendar parsing. Only as much of RFC 5545 as this calendar actually uses;
# anything else is reported and skipped rather than guessed at, since a wrong
# meeting time is worse than no meeting time.
# ---------------------------------------------------------------------------


def unfold(text: str) -> list[str]:
    """Rejoin folded lines. A line beginning with a space or tab continues the
    previous one — iCal wraps at 75 octets, mid-word."""
    lines: list[str] = []
    for raw in text.replace("\r\n", "\n").split("\n"):
        if raw[:1] in (" ", "\t") and lines:
            lines[-1] += raw[1:]
        else:
            lines.append(raw)
    return lines


def split_line(line: str) -> tuple[str, dict[str, str], str]:
    """"DTSTART;TZID=America/New_York:20260904T173000" becomes
    ("DTSTART", {"TZID": "America/New_York"}, "20260904T173000")."""
    head, _, value = line.partition(":")
    name, *param_parts = head.split(";")
    params = {}
    for part in param_parts:
        key, _, val = part.partition("=")
        params[key.upper()] = val.strip('"')
    return name.upper(), params, value


def parse_datetime(value: str, params: dict[str, str]) -> dt.datetime:
    """A DTSTART/DTEND/EXDATE value in any of the three forms iCal allows."""
    if params.get("VALUE") == "DATE" or re.fullmatch(r"\d{8}", value):
        day = dt.datetime.strptime(value, "%Y%m%d")
        return day.replace(tzinfo=CLUB_TZ)
    if value.endswith("Z"):
        stamp = dt.datetime.strptime(value, "%Y%m%dT%H%M%SZ")
        return stamp.replace(tzinfo=dt.timezone.utc).astimezone(CLUB_TZ)
    stamp = dt.datetime.strptime(value, "%Y%m%dT%H%M%S")
    tz = ZoneInfo(params["TZID"]) if "TZID" in params else CLUB_TZ
    return stamp.replace(tzinfo=tz)


class Event:
    def __init__(self) -> None:
        self.start: dt.datetime | None = None
        self.end: dt.datetime | None = None
        self.summary = ""
        self.location = ""
        self.rrule: dict[str, str] = {}
        self.excluded: set[dt.datetime] = set()
        self.cancelled = False


def parse_events(text: str) -> list[Event]:
    """Every VEVENT in the feed. VTIMEZONE blocks are skipped — zoneinfo
    already knows what America/New_York does."""
    events: list[Event] = []
    current: Event | None = None
    depth_other = 0

    for line in unfold(text):
        name, params, value = split_line(line)

        if name == "BEGIN" and value == "VEVENT":
            current = Event()
            continue
        if name == "END" and value == "VEVENT":
            if current and current.start:
                events.append(current)
            current = None
            continue
        # VCALENDAR wraps the whole file so doesn't count as nesting here;
        # VTIMEZONE and its STANDARD/DAYLIGHT blocks are stepped over.
        if name == "BEGIN" and value not in ("VEVENT", "VCALENDAR"):
            depth_other += 1
            continue
        if name == "END" and value != "VCALENDAR" and depth_other:
            depth_other -= 1
            continue
        if current is None or depth_other:
            continue

        if name == "DTSTART":
            current.start = parse_datetime(value, params)
        elif name == "DTEND":
            current.end = parse_datetime(value, params)
        elif name == "SUMMARY":
            current.summary = value.replace("\\,", ",").replace("\\n", " ").strip()
        elif name == "LOCATION":
            current.location = (
                value.replace("\\,", ",").replace("\\n", " ").strip()
            )
        elif name == "STATUS":
            current.cancelled = value.upper() == "CANCELLED"
        elif name == "RRULE":
            current.rrule = dict(
                part.split("=", 1) for part in value.split(";") if "=" in part
            )
        elif name == "EXDATE":
            for piece in value.split(","):
                current.excluded.add(parse_datetime(piece, params))

    return events


# ---------------------------------------------------------------------------
# Recurrence.
# ---------------------------------------------------------------------------

WEEKDAYS = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


def occurrences(event: Event, after: dt.datetime, limit: int) -> list[dt.datetime]:
    """The event's start times from `after` onward, soonest first. Handles a
    single event and a weekly rule, which is what a club meeting is; any
    other FREQ is reported and skipped rather than correctly expanded
    (BYSETPOS/BYMONTHDAY and their edge cases have never been needed here)."""
    if event.cancelled or event.start is None:
        return []

    if not event.rrule:
        return [event.start] if event.start >= after else []

    freq = event.rrule.get("FREQ", "")
    if freq != "WEEKLY":
        print(
            f"  ! skipping '{event.summary or 'untitled'}': FREQ={freq or '?'} is "
            f"not expanded by this script",
            file=sys.stderr,
        )
        return []

    interval = int(event.rrule.get("INTERVAL", 1))
    days = sorted(
        WEEKDAYS[code]
        for code in event.rrule.get("BYDAY", "").split(",")
        if code in WEEKDAYS
    ) or [event.start.weekday()]

    until = None
    if "UNTIL" in event.rrule:
        until = parse_datetime(event.rrule["UNTIL"], {})
    count = int(event.rrule["COUNT"]) if "COUNT" in event.rrule else None

    # Walk week by week from the series' start week, `interval` weeks per
    # step; every listed weekday within a week is an occurrence (BYDAY).
    week_start = event.start - dt.timedelta(days=event.start.weekday())
    found: list[dt.datetime] = []
    emitted = 0

    for step in range(520):  # generous ceiling for a rule with no UNTIL/COUNT
        for weekday in days:
            # Rebuilding from the date keeps wall-clock time across DST:
            # 17:30 stays 17:30 in November, not 16:30.
            day = (week_start + dt.timedelta(weeks=step * interval, days=weekday)).date()
            moment = dt.datetime.combine(day, event.start.timetz())

            if moment < event.start:
                continue
            if until and moment > until:
                return found
            if count is not None and emitted >= count:
                return found
            emitted += 1
            if moment in event.excluded or moment < after:
                continue
            found.append(moment)
            if len(found) >= limit:
                return found

    return found


# ---------------------------------------------------------------------------


def main() -> None:
    print(f"Reading {ICAL_URL.split('/ical/')[0]}/ical/…")
    try:
        with urllib.request.urlopen(ICAL_URL, timeout=30) as response:
            text = response.read().decode("utf-8")
    except Exception as error:
        sys.exit(
            f"Could not read the calendar feed: {error}\n"
            f"Check that the calendar is still public — Google returns 404 for a "
            f"calendar that has been made private."
        )

    now = dt.datetime.now(CLUB_TZ)
    events = parse_events(text)

    upcoming: list[dt.datetime] = []
    by_start: dict[dt.datetime, Event] = {}
    for event in events:
        for moment in occurrences(event, now, HORIZON):
            upcoming.append(moment)
            by_start.setdefault(moment, event)

    upcoming = sorted(set(upcoming))[:HORIZON]

    meetings = []
    for start in upcoming:
        event = by_start[start]
        length = (event.end - event.start) if event.end and event.start else None
        meetings.append(
            {
                "start": start.isoformat(),
                "end": (start + length).isoformat() if length else None,
                "summary": event.summary or "Mahjong Meeting",
                "location": event.location or None,
            }
        )

    OUT.write_text(json.dumps({
        "generated_at": dt.datetime.now(dt.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "meetings": meetings,
    }, indent=2) + "\n")

    if not meetings:
        print(
            "\n! No upcoming meetings found (the site will hide the next-meeting "
            "line). If that's a surprise, the recurring event has probably run "
            "past its UNTIL date and needs extending into the new semester.",
            file=sys.stderr,
        )
    else:
        print(f"\nNext {len(meetings)}:")
        for meeting in meetings:
            where = f"  ({meeting['location']})" if meeting["location"] else ""
            print(f"  {meeting['start']}  {meeting['summary']}{where}")

    print(f"\nWrote {OUT.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
