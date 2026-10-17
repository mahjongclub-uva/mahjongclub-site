import datetime as dt
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

from pipeline import build_meetings as meetings


MASTER = """BEGIN:VEVENT
UID:club-weekly
DTSTART;TZID=America/New_York:20261016T173000
DTEND;TZID=America/New_York:20261016T193000
RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=FR
SUMMARY:Club meeting
LOCATION:Room 1
END:VEVENT
"""


class MeetingCalendarTests(unittest.TestCase):
    def publish(self, feed):
        """Exercise the deploy entry point without a real calendar or data write."""
        now = dt.datetime(2026, 10, 16, 0, tzinfo=meetings.CLUB_TZ)
        response = mock.MagicMock()
        response.__enter__.return_value.read.return_value = feed.encode()
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "meetings.json"
            with (
                mock.patch.object(meetings, "OUT", target),
                mock.patch.object(meetings.urllib.request, "urlopen", return_value=response),
                mock.patch.object(meetings.dt, "datetime", wraps=dt.datetime) as clock,
                mock.patch.object(Path, "cwd", return_value=Path(folder)),
                redirect_stdout(io.StringIO()),
            ):
                clock.now.return_value = now
                meetings.main()
            return json.loads(target.read_text())["meetings"]

    def test_moved_instance_replaces_original_and_keeps_new_duration_and_room(self):
        moved = """BEGIN:VEVENT
UID:club-weekly
RECURRENCE-ID;TZID=America/New_York:20261023T173000
DTSTART;TZID=America/New_York:20261023T183000
DTEND;TZID=America/New_York:20261023T210000
SUMMARY:Later meeting
LOCATION:Room 2
END:VEVENT
"""
        for feed in (MASTER + moved, moved + MASTER):
            with self.subTest(override_first=feed.startswith(moved)):
                rows = self.publish(feed)
                self.assertEqual([row["start"] for row in rows], [
                    "2026-10-16T17:30:00-04:00",
                    "2026-10-23T18:30:00-04:00",
                    "2026-10-30T17:30:00-04:00",
                ])
                self.assertEqual(rows[1]["end"], "2026-10-23T21:00:00-04:00")
                self.assertEqual(rows[1]["location"], "Room 2")

    def test_cancelled_instance_without_start_removes_original(self):
        cancelled = """BEGIN:VEVENT
UID:club-weekly
RECURRENCE-ID:20261023T213000Z
STATUS:CANCELLED
END:VEVENT
"""
        rows = self.publish(MASTER + cancelled)
        self.assertEqual([row["start"][:10] for row in rows], ["2026-10-16", "2026-10-30"])

    def test_different_series_is_not_excluded_by_an_override(self):
        other = MASTER.replace("club-weekly", "another-series")
        cancelled = """BEGIN:VEVENT
UID:club-weekly
RECURRENCE-ID;TZID=America/New_York:20261023T173000
STATUS:CANCELLED
END:VEVENT
"""
        rows = self.publish(MASTER + other + cancelled)
        self.assertEqual(len(rows), 3)

    def test_weekly_rule_keeps_local_time_across_daylight_saving(self):
        event = meetings.parse_events(MASTER.replace("20261016", "20261030"))[0]
        starts = meetings.occurrences(event, event.start, 6)
        self.assertEqual([start.hour for start in starts], [17, 17, 17])
        self.assertEqual([start.utcoffset() for start in starts], [
            dt.timedelta(hours=-4), dt.timedelta(hours=-5), dt.timedelta(hours=-5),
        ])

    def test_exdate_removes_one_instance_without_extending_count(self):
        event = meetings.parse_events(MASTER.replace(
            "RRULE:", "EXDATE;TZID=America/New_York:20261023T173000\nRRULE:"
        ))[0]
        starts = meetings.occurrences(event, event.start, 6)
        self.assertEqual([start.day for start in starts], [16, 30])

    def test_unsupported_range_override_fails_instead_of_publishing_wrong_time(self):
        override = """BEGIN:VEVENT
UID:club-weekly
RECURRENCE-ID;RANGE=THISANDFUTURE;TZID=America/New_York:20261023T173000
DTSTART;TZID=America/New_York:20261023T183000
END:VEVENT
"""
        with self.assertRaisesRegex(ValueError, "RANGE"):
            meetings.parse_events(MASTER + override)
