#!/usr/bin/env python3
"""
Turns the club's public Google Calendar into the JSON the website reads.

    python3 pipeline/build_meetings.py

The site is a static export, so there is no server to ask "when is the next
meeting?" at the moment somebody visits. This script asks at build time
instead: it reads the calendar's public iCal feed, works out the next few
meetings, and writes data/meetings.json. A weekly GitHub Action re-runs it and
redeploys, which is what keeps the answer current.

That weekly cadence is the whole accuracy story. A meeting cancelled on
Thursday will still be on the site until the next run, so cancel by removing
the event and, if it matters, say so on Instagram too.

The event's Location is published, because a club that wants people to turn up
has to say where. Whatever is typed into that field on the calendar appears on
the site, so keep it to a building and room and never to anything that reads
as a person's whereabouts.

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

# How many upcoming meetings to write out. More than one on purpose: if a
# weekly run is missed, the site can still skip past a meeting that has already
# happened and name a real one instead of a stale one.
HORIZON = 6

OUT = Path(__file__).resolve().parent.parent / "data" / "meetings.json"


# ---------------------------------------------------------------------------
# iCalendar parsing.
#
# Only as much of RFC 5545 as this calendar actually uses. Anything else is
# reported and skipped rather than guessed at, because a wrong meeting time is
# worse than no meeting time.
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
        # VCALENDAR is the wrapper around the whole file, so it is not nesting
        # in any sense that matters here. Anything else — VTIMEZONE and the
        # STANDARD/DAYLIGHT blocks inside it — is a block to step over.
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
    """The event's start times from `after` onward, soonest first.

    Handles a single event and a weekly rule, which is what a club meeting is.
    Any other FREQ is reported and skipped: expanding monthly and yearly rules
    correctly means BYSETPOS and BYMONTHDAY and a pile of edge cases that no
    club calendar here has ever needed.
    """
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

    # Walk week by week from the week the series starts in. Each step is
    # `interval` weeks, and inside a week every listed weekday is an
    # occurrence — that is exactly what BYDAY means.
    week_start = event.start - dt.timedelta(days=event.start.weekday())
    found: list[dt.datetime] = []
    emitted = 0

    # A generous ceiling so a rule with no UNTIL and no COUNT still terminates.
    for step in range(520):
        for weekday in days:
            # Rebuilding from the date keeps the wall-clock time across a DST
            # change: 17:30 stays 17:30 in November, it does not become 16:30.
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
            "\n! No upcoming meetings found. The site will hide the next-meeting "
            "line rather than show an empty one — but if that is a surprise, the "
            "recurring event has probably run past its UNTIL date and needs "
            "extending into the new semester.",
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
