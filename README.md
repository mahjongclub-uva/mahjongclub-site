# Mahjong Club @ UVA website

A [Next.js](https://nextjs.org/) site, statically exported and served by GitHub Pages.
For the nontechnical publishing guide, see [OFFICER_GUIDE.md](OFFICER_GUIDE.md).

## Development

Requires Node 22 and Python 3 (for the `pipeline/` scripts).

```bash
npm install
npm run dev       # local dev server at http://localhost:3000
```

Before committing, run what CI runs:

```bash
npm run lint
npm test                   # component/unit tests
npm run test:site-content  # validates the officer content pipeline
npm run photos:check
npm run build              # production build, static export to out/
```

Formatting is Prettier, on its defaults:

```bash
npm run format        # rewrite
npm run format:check  # report only
```

`src/app/globals.css` is in `.prettierignore` because it is hand-written and
deliberately compact; formatting it grows the file by half. Remove that line if
you would rather have the consistency.

`npm run hooks:install` wires these into a pre-commit hook so photo metadata is checked automatically; see [Add photos](#add-photos).

## Officer content workflow

Officers can update public website copy in Google Sheets without editing code.
The sheet is read-only from GitHub: it can propose a pull request, but it cannot publish directly.
A maintainer reviews and merges the pull request to publish through the existing GitHub Pages workflow.

For the day-to-day publishing steps, see [OFFICER_GUIDE.md](OFFICER_GUIDE.md).
This section covers only the one-time setup a maintainer does once, before officers can use that workflow.

### Where site copy actually lives

Every visible string that is not page furniture comes from one chain:

```
officer Google Sheet  →  pipeline/build_site_content.py  →  data/site.json  →  src/lib/site.ts  →  components
```

**`data/site.json` is generated. Do not edit it by hand.** It has no guard
against it, and an edit there desynchronises the chain in two ways at once:
`npm run test:site-content` fails, because it asserts the template still builds
the committed `site.json`; and dropping a key breaks the build, because
`src/lib/site.ts` reads each one by name.

To change copy locally — a demo, or trying wording before it goes to officers —
edit `pipeline/site-content-template.csv` and rebuild:

```bash
npm run data:site -- --input pipeline/site-content-template.csv
```

That prints `Sheet is not marked ready_to_publish; no file changed` unless
`ready_to_publish` is `TRUE`, which is the safety catch working. The template
ships with it `FALSE`, and with every officer `.consent` `FALSE`, so flip them
in a scratch copy rather than committing them `TRUE`.

Adding or removing a field means four files: the template CSV, `TEXT_FIELDS` and
the returned dict in `build_site_content.py`, `src/lib/site.ts`, and the
component that renders it. Then regenerate `data/site.json`.

**The officer Sheet is a fifth place.** Rows the code does not use yet are
ignored with a note in the pull request, but a row the code expects and the
Sheet lacks fails the workflow with `missing key(s)`. So add a field's row to
the Sheet before shipping its code, and ship the code that drops a field
before deleting its row.

### One-time setup

1. Import `pipeline/site-content-template.csv` into a new Google Sheet.
2. Protect the `key` column and give officers edit access to the `value` column.
3. Use **File → Share → Publish to web**, select that tab, and choose **Comma-separated values (.csv)**.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**.
5. Add a repository variable named `SITE_CONTENT_CSV_URL` containing the published CSV URL.
6. Under **Settings → Actions → General → Workflow permissions**, allow GitHub Actions to create pull requests.

The published sheet must contain only information intended for the public website.
Never add the private roster, legal names used only for score processing, personal addresses, or private contact information.
The workflow manages homepage and About copy, officer display names, public contact details, and social links.
Scores remain in the private roster pipeline, meetings remain in Google Calendar, and photos remain a manual consent and metadata-review process.

## Add photos

Put original photos in `photo-inbox/`, then run:

```bash
npm run photos:prepare
```

The command fixes orientation, limits each image to 2400 pixels, removes hidden
metadata, and writes a WebP file to `public/photos/`.
It also prints the width and height to copy into `src/lib/site.ts`.

Each original is then moved to `photo-inbox/processed/`, so the inbox holds only
what still needs doing and a second run is a no-op instead of re-encoding
everything. Originals are archived rather than deleted: the published WebP is
resized and stripped, so it cannot be turned back into the original. All of
`photo-inbox/` is gitignored, archive included. Clear it out yourself once the
originals are backed up somewhere private.

Run `npm run hooks:install` once per computer to prepare photos automatically
before commits.
CI runs `npm run photos:check` and rejects public images that still contain
EXIF, XMP, IPTC, comments, device identifiers, or editor data.
