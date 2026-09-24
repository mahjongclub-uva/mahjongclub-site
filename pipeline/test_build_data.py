import contextlib
import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pipeline import build_data


class PrivateLogTests(unittest.TestCase):
    def test_missing_date_warning_does_not_print_player_names(self):
        table = build_data.Table(21, None)
        table.seats = [
            (f"Private Player {seat}", 205, 0)
            for seat in range(1, build_data.SEATS_PER_TABLE + 1)
        ]
        output = io.StringIO()

        with contextlib.redirect_stdout(output):
            build_data.check_tables([table])

        self.assertIn("Table 21 has no date", output.getvalue())
        self.assertNotIn("Private Player", output.getvalue())

    def test_invalid_score_does_not_print_player_names(self):
        table = build_data.Table(3, "2026-09-24")
        table.seats = [("Private Player", 204, 0)]
        output = io.StringIO()

        with contextlib.redirect_stderr(output), self.assertRaises(SystemExit):
            build_data.check_tables([table])

        self.assertIn("Table 3", output.getvalue())
        self.assertNotIn("Private Player", output.getvalue())

    def test_ci_requires_all_players_in_the_private_roster(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            roster_path = Path(temp_dir) / "roster.local.json"
            output = io.StringIO()
            with (
                patch.object(build_data, "ROSTER_PATH", roster_path),
                patch.dict(os.environ, {"GITHUB_ACTIONS": "true"}),
                contextlib.redirect_stderr(output),
                self.assertRaises(SystemExit),
            ):
                build_data.load_roster(["Private Player"])

        self.assertIn("missing 1 player", output.getvalue())
        self.assertNotIn("Private Player", output.getvalue())


if __name__ == "__main__":
    unittest.main()
