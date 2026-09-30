import contextlib
import io
import unittest

from pipeline import build_data
from pipeline.migrate_roster import derive_display, likely_duplicates, plan_rows


class MigrateRosterTests(unittest.TestCase):
    def test_display_extends_the_surname_only_until_unique(self):
        self.assertEqual(derive_display("Kevin Jones", set()), "Kevin J.")
        self.assertEqual(derive_display("Kevin Jones", {"Kevin J."}), "Kevin Jo.")
        self.assertIsNone(derive_display("Kevin J", {"Kevin J."}))

    def test_rerun_keeps_existing_rows_and_ids(self):
        local = {"Ann Lee": {"id": "p002", "display": "Ann L.", "opt_out": True}}
        existing = {"Bo Kim": {"id": "p001", "display": "Bo K.", "opt_out": False}}
        rows = plan_rows(existing, local, ["ann  LEE", "Bo Kim", "Ann Long"])
        # Ann Lee comes from the local roster with her id and opt-out, the
        # attendance spellings of known names are skipped, and a newcomer
        # continues the numbering with a short name that doesn't collide.
        self.assertEqual(rows, [
            ["p002", "", "Ann Lee", "Ann L.", True],
            ["p003", "", "Ann Long", "Ann Lo.", False],
        ])
        self.assertEqual(plan_rows({**existing, "Ann Lee": local["Ann Lee"], "Ann Long": {
            "id": "p003", "display": "Ann Lo.", "opt_out": False}}, local, ["Ann Long"]), [])

    def test_flags_similar_names_by_id_only(self):
        self.assertEqual(
            likely_duplicates({"Ben Liu": "p004", "Benjamin Liu": "p001", "Ben Wu": "p002"}),
            [("p001", "p004")],
        )

    def test_roster_tab_rejects_a_repeated_id(self):
        grid = {(1, c + 1): h for c, h in enumerate(build_data.ROSTER_COLUMNS)}
        for row, name in ((2, "Ann Lee"), (3, "Bo Kim")):
            grid.update({(row, 1): "p001", (row, 3): name, (row, 4): name[:5], (row, 5): "False"})
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            build_data.roster_from_grid(grid)
        grid[3, 1] = "p002"
        self.assertEqual(build_data.roster_from_grid(grid)["Bo Kim"],
                         {"id": "p002", "display": "Bo Ki", "opt_out": False})


if __name__ == "__main__":
    unittest.main()
