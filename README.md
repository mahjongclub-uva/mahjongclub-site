# Mahjong Club @ UVA website

A statically exported [Next.js](https://nextjs.org/) site on GitHub Pages.
Officers: see [OFFICER_GUIDE.md](OFFICER_GUIDE.md).

## Development

Needs Node 22 and Python 3.

```bash
npm install
npm run dev   # http://localhost:3000
```

Before committing, run what CI runs:

```bash
npm run lint
npm test
npm run test:site-content
npm run photos:check
npm run build
```

Format with `npm run format`. `src/app/globals.css` is skipped on purpose (see `.prettierignore`).
`npm run hooks:install` adds a pre-commit hook that prepares photos.

## Site copy

```
officer Sheet → pipeline/build_site_content.py → data/site.json → src/lib/site.ts → components
```

- **Never edit `data/site.json` by hand.** It's generated, and hand edits break the tests and build.
- To try wording locally, edit `pipeline/site-content-template.csv`, set `ready_to_publish` and the `.consent` rows to `TRUE` in a scratch copy, and run `npm run data:site -- --input <copy>`.
- A new field touches the template, `TEXT_FIELDS` and the returned dict in `build_site_content.py`, `src/lib/site.ts`, and its component.
- Sheet rows the code doesn't read yet are ignored. A row the code needs but the Sheet lacks fails the run. So add a row to the Sheet before shipping its code, and remove the code before deleting a row.

### One-time setup

1. Import `pipeline/site-content-template.csv` into a Google Sheet. Protect the `key` column.
2. **File → Share → Publish to web** that tab as CSV.
3. Add the URL as the repository variable `SITE_CONTENT_CSV_URL`.
4. In **Settings → Actions → General**, allow Actions to create pull requests.

The published Sheet is public. Never put the roster, legal names, addresses or private contacts in it.

## Scores

`python3 pipeline/build_data.py` reads a local copy of the score workbook and writes public data files under `data/`.
Real names stay in `pipeline/roster.local.json`, which is gitignored and must never be committed.
The scoring rules are in [OFFICER_GUIDE.md](OFFICER_GUIDE.md#how-scoring-works).

To read the private Google Sheet directly, use a maintainer computer with access to the file.
Create a Google Cloud project, enable the Google Sheets API, and create a Desktop OAuth client.
Create the config folder with `mkdir -p ~/.config/mahjongclub-site`, then save the downloaded JSON as `~/.config/mahjongclub-site/google-oauth-client.json`.
Create and activate a virtual environment, then install the optional API libraries.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r pipeline/requirements.txt
```

Then run `python3 pipeline/build_data.py --source sheets --spreadsheet-id <spreadsheet-id>`.
The first run opens Google sign-in with read-only spreadsheet access; its token stays under `~/.config/mahjongclub-site/` and outside the repository.
An OAuth app left in Google's Testing status issues refresh tokens that expire after seven days, so use the appropriate production setup or expect to sign in again weekly.
Review the generated public data before committing it.

After approval, opening a pull request with generated data runs the existing checks; merging it to `main` starts the existing GitHub Pages deployment.
The website-copy workflow remains separate: it proposes a pull request from the published public copy Sheet and does not receive access to the private score Sheet.

## Custom domain

The current GitHub Pages URL remains the default.
After choosing and registering a domain, set the repository Actions variable `NEXT_PUBLIC_SITE_URL` to `https://your-domain` and configure that same custom domain in GitHub Pages settings.
The build then serves routes and assets from the domain root and uses it as the metadata base.
Then add the DNS records GitHub Pages specifies at the registrar and wait for DNS and HTTPS verification to finish.

## Photos

Put originals in `photo-inbox/` and run `npm run photos:prepare`.
It fixes orientation, resizes to 2400px, strips metadata, writes WebP to `public/photos/`, prints the size for `src/lib/site.ts`, and moves the original to `photo-inbox/processed/`.
All of `photo-inbox/` is gitignored.
CI rejects public images that still carry metadata.
