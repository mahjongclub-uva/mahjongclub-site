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

    def test_template_builds_current_site_content(self) -> None:
        expected = json.loads((REPO / "data" / "site.json").read_text())
        self.assertEqual(validate(self.approved_rows()), expected)

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
