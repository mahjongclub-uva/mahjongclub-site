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

Adding or removing a field means four files, in this order: the template CSV,
`TEXT_FIELDS` and the returned dict in `build_site_content.py`, `src/lib/site.ts`,
and the component that renders it. Then regenerate `data/site.json`.

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

## Scores: reading the sheet

`pipeline/build_data.py` currently reads an `.xlsx` the maintainer downloads by
hand from the score sheet (**File → Download → Microsoft Excel**), unzips it,
and parses the XML with the standard library. `read_grid` is the only function
that knows where the data came from; everything after it works on a parsed
grid. Swapping the source means replacing that one function.

This is written down because the swap is not free, and the current flow is not
as bad as it looks.

### What switching to the Sheets API buys

- **No manual download.** Today a stale export silently produces stale
  standings, with nothing to catch it. The API always reads the live sheet.
- **A fix for the roster problem.** `pipeline/roster.local.json` maps real names
  to ids and lives on one laptop. Lose the laptop and every player is
  renumbered. A private tab on the sheet, read the same way, would make ids as
  durable as the sheet — this is the real prize, more than skipping a download.
- **Better errors.** A missing tab is an API error naming the tab, not a
  confusing parse failure on a file that may simply be out of date.

### What it costs

- **A dependency, and the end of "only stdlib".** Reading a _private_ sheet
  needs a service account, not an API key. A service account authenticates by
  signing a JWT with an RSA private key, and Python's standard library cannot
  do RSA signing. So this needs `google-auth` at minimum — the first thing
  anyone has to install to run the pipeline, and a `requirements.txt` to
  maintain. `build_data.py`'s "nothing to install" promise goes with it.
- **A credential to hold.** A JSON private key file, on the maintainer's
  laptop, gitignored, handed over at every officer turnover. It is a real
  secret with a real loss path, replacing a workflow whose worst case is an
  out-of-date spreadsheet.
- **It still cannot run in CI.** The pipeline needs the roster, the roster
  holds real names, and real names must not reach this public repo or its build
  logs. So the API removes the download step but not the local run — the
  maintainer still runs the script and commits the JSON. The automation win is
  smaller than it first appears.
- **An unanswered question.** Whose Google account owns the service account is
  still open, and it should not be a student who graduates in May.

Quotas are not a constraint: Sheets API reads are free, with no daily cap and
300 requests per minute per project, against a pipeline that makes one read per
run.

### If you do it

1. Create a Google Cloud project, enable the Sheets API, create a service
   account, and download its JSON key.
2. Share the score sheet with the service account's email, **Viewer** only.
3. `pip install google-auth`, and gitignore the key file.
4. Replace `read_grid` with a `spreadsheets.values.get` call on the tab,
   returning the same `{(row, column): text}` dict, 1-based, blanks absent.
   Nothing below it changes.
5. Move the roster to a private tab and read it the same way, or the largest
   benefit goes unclaimed.

The scope is one function and a credential. Doing it for the roster is worth
it; doing it only to skip a download is not.

## Add photos

Put original photos in `photo-inbox/`, then run:

```bash
npm run photos:prepare
```

The command fixes orientation, limits each image to 2400 pixels, removes hidden
metadata, and writes a WebP file to `public/photos/`.
It also prints the width and height to copy into `src/lib/site.ts`.

Run `npm run hooks:install` once per computer to prepare photos automatically
before commits.
CI runs `npm run photos:check` and rejects public images that still contain
EXIF, XMP, IPTC, comments, device identifiers, or editor data.
