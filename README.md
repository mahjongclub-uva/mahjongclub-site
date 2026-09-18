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
npm test               # component/unit tests
npm run test:site-content  # validates the officer content pipeline
npm run photos:check
npm run build           # production build, static export to out/
```

`npm run hooks:install` wires these into a pre-commit hook so photo metadata is checked automatically; see [Add photos](#add-photos).

## Officer content workflow

Officers can update public website copy in Google Sheets without editing code.
The sheet is read-only from GitHub: it can propose a pull request, but it cannot publish directly.
A maintainer reviews and merges the pull request to publish through the existing GitHub Pages workflow.

For the day-to-day publishing steps, see [OFFICER_GUIDE.md](OFFICER_GUIDE.md).
This section covers only the one-time setup a maintainer does once, before officers can use that workflow.

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

Run `npm run hooks:install` once per computer to prepare photos automatically
before commits.
CI runs `npm run photos:check` and rejects public images that still contain
EXIF, XMP, IPTC, comments, device identifiers, or editor data.
