import contextlib
import io
import json
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

    def test_season_net_ranks_losses_below_even_when_earlier_gain_was_higher(self):
        first = build_data.Table(1, "2026-09-18")
        first.seats = [("A", 305, 100), ("B", 105, -100), ("C", 205, 0), ("D", 205, 0)]
        second = build_data.Table(2, "2026-09-25")
        second.seats = [("A", 55, -150), ("E", 355, 150), ("F", 205, 0), ("G", 205, 0)]
        roster = {name: {"id": f"p{i:03d}", "display": name, "opt_out": False}
                  for i, name in enumerate("ABCDEFG", 1)}

        standings, unranked = build_data.aggregate([first, second], roster, 1, "season-net")

        self.assertEqual(unranked, [])
        self.assertLess(next(p["rank"] for p in standings if p["display"] == "C"),
                        next(p["rank"] for p in standings if p["display"] == "A"))
        self.assertEqual(205 + next(p["total_net"] for p in standings if p["display"] == "A"), 155)

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

    def test_new_local_players_are_opted_out_until_approved(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            roster_path = Path(temp_dir) / "roster.local.json"
            with (
                patch.object(build_data, "ROSTER_PATH", roster_path),
                patch.dict(os.environ, {"GITHUB_ACTIONS": "false"}),
            ):
                roster = build_data.load_roster(["Private Player"])

            self.assertTrue(roster["Private Player"]["opt_out"])
            self.assertTrue(json.loads(roster_path.read_text())["players"]["Private Player"]["opt_out"])


if __name__ == "__main__":
    unittest.main()
