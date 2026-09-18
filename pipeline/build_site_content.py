#!/usr/bin/env python3
"""Build public website copy from a two-column Google Sheet CSV export."""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.error
import urllib.request
from pathlib import Path


REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "site.json"
ROLES = ["President", "Vice President", "Secretary", "Treasurer", "Publicity"]

TEXT_FIELDS = {
    "tagline": 120,
    "home.welcome_title": 80,
    "home.welcome": 300,
    "home.welcome_note": 100,
    "home.meeting_photo_pending": 120,
    "home.photos_pending": 100,
    "home.photo_intro": 160,
    "about.intro": 180,
    "about.game": 500,
    "about.variety": 300,
    "about.other_styles": 500,
    "about.table_photo": 80,
    "contact_email": 160,
    "location": 120,
    "instagram": 40,
    "groupme_url": 300,
}


def die(message: str) -> None:
    raise ValueError(message)


def read_source(path: str | None, url: str | None) -> str:
    if path:
        return Path(path).read_text(encoding="utf-8-sig")
    if not url:
        die("set SITE_CONTENT_CSV_URL or pass --input")
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "docs.google.com":
        die("SITE_CONTENT_CSV_URL must be an HTTPS docs.google.com CSV export")
    request = urllib.request.Request(url, headers={"User-Agent": "mahjongclub-site/1"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8-sig")


def parse_rows(text: str) -> dict[str, str]:
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames != ["key", "value"]:
        die("the sheet must have exactly two columns named key and value")
    values: dict[str, str] = {}
    for line, row in enumerate(reader, 2):
        key = (row.get("key") or "").strip()
        value = (row.get("value") or "").strip()
        if not key:
            continue
        if key in values:
            die(f"row {line}: duplicate key {key!r}")
        values[key] = value
    return values


def truthy(value: str) -> bool:
    return value.strip().lower() in {"true", "yes", "1", "ready"}


def validate(values: dict[str, str]) -> dict[str, object] | None:
    officer_keys = {
        f"officer.{role.lower().replace(' ', '_')}.{suffix}"
        for role in ROLES
        for suffix in ("name", "consent")
    }
    allowed = set(TEXT_FIELDS) | officer_keys | {"ready_to_publish"}
    unknown = sorted(set(values) - allowed)
    if unknown:
        die(f"unknown key(s): {', '.join(unknown)}")

    missing = sorted(set(TEXT_FIELDS) - set(values))
    if missing:
        die(f"missing key(s): {', '.join(missing)}")

    if not truthy(values.get("ready_to_publish", "")):
        print("Sheet is not marked ready_to_publish; no file changed.")
        return None

    for key, maximum in TEXT_FIELDS.items():
        value = values[key]
        if key not in {"instagram", "groupme_url"} and not value:
            die(f"{key} cannot be blank")
        if len(value) > maximum:
            die(f"{key} is {len(value)} characters; maximum is {maximum}")
        if any(ord(char) < 32 and char not in "\n\t" for char in value):
            die(f"{key} contains an unsupported control character")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", values["contact_email"]):
        die("contact_email is not a valid email address")
    if values["instagram"] and not re.fullmatch(r"[A-Za-z0-9._]+", values["instagram"]):
        die("instagram must be a handle without @ or a URL")
    if values["groupme_url"]:
        groupme = urllib.parse.urlparse(values["groupme_url"])
        if groupme.scheme != "https" or groupme.hostname not in {"groupme.com", "www.groupme.com"}:
            die("groupme_url must be an HTTPS groupme.com URL")

    officers = []
    for role in ROLES:
        slug = role.lower().replace(" ", "_")
        name = values.get(f"officer.{slug}.name", "").strip()
        consent = values.get(f"officer.{slug}.consent", "")
        if name and not truthy(consent):
            die(f"{role} has a public name but consent is not checked")
        if len(name) > 80:
            die(f"{role} name is longer than 80 characters")
        officers.append({"role": role, "name": name or None})

    return {
        "tagline": values["tagline"],
        "instagram": values["instagram"],
        "groupme_url": values["groupme_url"],
        "contact_email": values["contact_email"],
        "location": values["location"],
        "home": {
            "welcome_title": values["home.welcome_title"],
            "welcome": values["home.welcome"],
            "welcome_note": values["home.welcome_note"],
            "meeting_photo_pending": values["home.meeting_photo_pending"],
            "photos_pending": values["home.photos_pending"],
            "photo_intro": values["home.photo_intro"],
        },
        "about": {
            "intro": values["about.intro"],
            "game": values["about.game"],
            "variety": values["about.variety"],
            "other_styles": values["about.other_styles"],
            "table_photo": values["about.table_photo"],
        },
        "officers": officers,
    }


def flatten(value: object, prefix: str = "") -> dict[str, str]:
    if isinstance(value, dict):
        result: dict[str, str] = {}
        for key, child in value.items():
            result.update(flatten(child, f"{prefix}.{key}" if prefix else key))
        return result
    if isinstance(value, list) and prefix == "officers":
        return {
            f"officer.{item['role']}": item.get("name") or "To be announced"
            for item in value
        }
    return {prefix: "" if value is None else str(value)}


def write_summary(path: str, previous: object, proposed: object) -> None:
    before = flatten(previous)
    after = flatten(proposed)
    lines = [
        "Public website copy was read from the officer Google Sheet and passed validation, lint, tests, and the production build.",
        "",
        "## Proposed changes",
        "",
        "| Field | Current | Proposed |",
        "| --- | --- | --- |",
    ]
    for key in sorted(set(before) | set(after)):
        if before.get(key) == after.get(key):
            continue
        old = before.get(key, "").replace("|", "\\|").replace("\n", " ")
        new = after.get(key, "").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| `{key}` | {old or '*(blank)*'} | {new or '*(blank)*'} |")
    lines += [
        "",
        "Review this list and the Files changed tab. Merge the pull request to publish through the normal Pages workflow.",
    ]
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", help="local CSV file, for testing or setup")
    parser.add_argument("--summary", help="write a Markdown before/after summary")
    args = parser.parse_args()
    try:
        source = read_source(args.input, os.environ.get("SITE_CONTENT_CSV_URL"))
        content = validate(parse_rows(source))
    except (OSError, UnicodeError, ValueError, urllib.error.URLError) as error:
        print(f"site content error: {error}", file=sys.stderr)
        return 1
    if content is None:
        return 0
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    if args.summary:
        write_summary(args.summary, previous, content)
    OUT.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
