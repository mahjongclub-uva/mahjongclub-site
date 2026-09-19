import json
import unittest
from pathlib import Path

from pipeline.build_site_content import ROLES, flatten, parse_rows, validate


REPO = Path(__file__).resolve().parent.parent
TEMPLATE = REPO / "pipeline" / "site-content-template.csv"


class SiteContentTests(unittest.TestCase):
    def approved_rows(self) -> dict[str, str]:
        rows = parse_rows(TEMPLATE.read_text(encoding="utf-8"))
        rows["ready_to_publish"] = "TRUE"
        for role in ROLES:
            slug = role.lower().replace(" ", "_")
            rows[f"officer.{slug}.consent"] = "TRUE"
        return rows

    def test_template_builds_the_same_shape_as_site_content(self) -> None:
        """The template must stay a complete, valid input: every field the site
        reads, and no field the site does not.

        Deliberately compares the shape and not the values. The CI workflow
        writes data/site.json from the officer Sheet and then runs these tests,
        so the moment an officer edits any wording the values legitimately
        differ from this template. Asserting equality here meant the workflow
        could never open a pull request, which is the one thing it exists for.
        """
        current = json.loads((REPO / "data" / "site.json").read_text())
        built = validate(self.approved_rows())
        self.assertEqual(flatten(built).keys(), flatten(current).keys())

    def test_unready_sheet_does_not_publish(self) -> None:
        rows = self.approved_rows()
        rows["ready_to_publish"] = "FALSE"
        self.assertIsNone(validate(rows))

    def test_public_officer_name_requires_consent(self) -> None:
        rows = self.approved_rows()
        rows["officer.president.consent"] = "FALSE"
        with self.assertRaisesRegex(ValueError, "consent is not checked"):
            validate(rows)

    def test_summary_flattens_officers_by_role(self) -> None:
        content = validate(self.approved_rows())
        self.assertEqual(flatten(content)["officer.President"], "Loy Luo")


if __name__ == "__main__":
    unittest.main()
