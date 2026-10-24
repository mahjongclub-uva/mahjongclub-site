import contextlib
import io
import unittest
from unittest.mock import patch

from pipeline import build_data


class ScoreImportTests(unittest.TestCase):
    def grid(self, points: str, net: str) -> dict[tuple[int, int], str]:
        grid = {(1, 2): "Table 1", (2, 2): "Player", (2, 5): "46313"}
        for row in range(3, 7):
            grid[row, 2] = f"Private Player {row}"
            grid[row, 3] = points
            grid[row, 4] = net
        return grid

    def test_fractional_scores_stop_the_import_before_any_output_is_written(self):
        # Truncation used to turn an unbalanced 823.6-point table into 820.
        output = io.StringIO()
        with (
            patch("sys.argv", ["build_data.py", "--spreadsheet-id", "test"]),
            patch.object(build_data, "read_sheets_grid", return_value=self.grid("205.9", "0.9")),
            patch.object(build_data, "read_roster_tab") as read_roster_tab,
            patch.object(build_data, "write_json") as write_json,
            contextlib.redirect_stdout(io.StringIO()),
            contextlib.redirect_stderr(output),
            self.assertRaises(SystemExit),
        ):
            build_data.main()

        read_roster_tab.assert_not_called()
        write_json.assert_not_called()
        self.assertIn("Table 1 row 3", output.getvalue())
        self.assertNotIn("Private Player", output.getvalue())

    def test_invalid_points_or_net_are_rejected_without_printing_names(self):
        for points, net in (("205.5", "0"), ("205", "0.5"), ("NaN", "0"),
                            ("205", "Infinity"), ("not a score", "0")):
            with self.subTest(points=points, net=net):
                output = io.StringIO()
                with contextlib.redirect_stderr(output), self.assertRaises(SystemExit):
                    build_data.parse_tables(self.grid(points, net))
                self.assertIn("whole-number points and net", output.getvalue())
                self.assertNotIn("Private Player", output.getvalue())

    def test_integer_decimal_and_exponent_cells_still_import(self):
        tables = build_data.parse_tables(self.grid("205.0", "0e0"))
        build_data.check_tables(tables)
        self.assertEqual([seat[1:] for seat in tables[0].seats], [(205, 0)] * 4)

    def test_games_sum_per_player_over_counted_tables(self):
        grid = self.grid("205", "0")
        grid[1, 6] = "12"
        self.assertEqual(build_data.parse_tables(grid)[0].games, 12)
        for bad in ("0", "2.5", "twelve"):
            with self.subTest(games=bad):
                grid[1, 6] = bad
                with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                    build_data.parse_tables(grid)

        counted = build_data.Table(1, "2026-10-23", 12)
        counted.seats = [("A", 205, 0), ("B", 205, 0), ("C", 205, 0), ("D", 205, 0)]
        uncounted = build_data.Table(2, "2026-10-23")
        uncounted.seats = [("A", 205, 0), ("E", 205, 0), ("F", 205, 0), ("G", 205, 0)]
        roster = {name: {"id": f"p{i:03d}", "display": name, "opt_out": False}
                  for i, name in enumerate("ABCDEFG", 1)}
        standings, _ = build_data.aggregate([counted, uncounted], roster, 1, "season-net")
        games = {p["display"]: p.get("games_played") for p in standings}

        self.assertEqual((games["A"], games["B"], games["E"]), (12, 12, None))


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

    def test_rank_changes_compare_with_the_board_before_the_latest_session(self):
        earlier = build_data.Table(1, "2026-10-09")
        earlier.seats = [("A", 405, 200), ("B", 105, -100), ("C", 205, 0), ("D", 105, -100)]
        latest = build_data.Table(2, "2026-10-16")
        latest.seats = [("A", 55, -150), ("B", 405, 200), ("E", 155, -50), ("F", 205, 0)]
        undated = build_data.Table(21, None)
        undated.seats = [("A", 255, 50), ("C", 155, -50), ("D", 255, 50), ("G", 155, -50)]
        roster = {name: {"id": f"p{i:03d}", "display": name, "opt_out": False}
                  for i, name in enumerate("ABCDEFG", 1)}
        tables = [earlier, latest, undated]

        standings, _ = build_data.aggregate(tables, roster, 1, "season-net")
        build_data.add_rank_changes(standings, tables, roster, 1)
        moved = {p["display"]: (p["rank"], p["rank_change"]) for p in standings}

        # Before Oct 16: A 1st, G 2nd, C and D tied 3rd, B 4th.
        self.assertEqual(moved["B"], (1, 3))  # up three places
        self.assertEqual(moved["G"], (4, -2))
        self.assertEqual(moved["A"], (2, -1))  # down one
        self.assertEqual(moved["F"][1], None)  # new to the board
        self.assertEqual(moved["E"][1], None)

    def test_invalid_score_does_not_print_player_names(self):
        table = build_data.Table(3, "2026-09-24")
        table.seats = [("Private Player", 204, 0)]
        output = io.StringIO()

        with contextlib.redirect_stderr(output), self.assertRaises(SystemExit):
            build_data.check_tables([table])

        self.assertIn("Table 3", output.getvalue())
        self.assertNotIn("Private Player", output.getvalue())


if __name__ == "__main__":
    unittest.main()
