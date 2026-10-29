# Mahjong Club @ UVA website

The website for the Mahjong Club at UVA, a student club playing Fuzhou-style mahjong. Live at **[mahjongclubuva.org](https://mahjongclubuva.org/)**.

- **Officers:** you don't need this page. Start with the [officer guide](OFFICER_GUIDE.md).
- **Maintainers:** this page covers what the site does, how it is built, and how to change it.

## What it does

**For visitors**

- Shows when and where the next meeting is, read from the club's Google Calendar.
- Teaches the game with short lessons you can play in the browser.
- Shows the season leaderboard.
- Links to the club's Instagram and photos.

**For meeting nights**

- Players check in by scanning a QR code on their phone.
- Each table records its games as they are played, and the scores add up automatically.
- Live standings show how tonight changes the season.

**For officers**

- Site wording, meeting times and scores are edited in Google Sheets and Calendar, with no code. Photos and club links still live in `src/lib/site.ts`.

## How it works

```text
Google Sheets + Calendar ─▶ pipeline/ (Python) ─▶ data/*.json ─▶ Next.js site ─▶ GitHub Pages

Meeting night: phone ─▶ /checkin/ ─▶ Google Apps Script ─▶ score workbook (Sheet)
```

1. The club keeps everything in Google: a private score workbook, a public sheet of site wording, and the club calendar.
2. A Python script in `pipeline/` reads them and writes plain JSON files into `data/`.
3. The Next.js app reads only those files and builds a static website, which GitHub Pages hosts for free.
4. On meeting nights, the check-in and table pages talk to a small Google Apps Script app that writes straight to the score workbook. See [`apps-script/README.md`](apps-script/README.md).

Three rules shape everything else:

- **Nothing costs money.** There is no server or database to pay for or keep running.
- **Google Sheets are the source of truth.** The pipeline only reads them; the site only reads `data/`.
- **Real names never enter this repository.** They stay in the workbook's private Roster tab. The site only shows short display names like "Kevin J.".

## Getting started

You need [Node.js](https://nodejs.org/) 22 and Python 3.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

### Scripts

| Command                      | What it does                                          |
| ---------------------------- | ----------------------------------------------------- |
| `npm run dev`                | Start the site locally with live reload               |
| `npm run build`              | Build the static site into `out/`                     |
| `npm run lint`               | Check the code for mistakes                           |
| `npm run format`             | Fix formatting (`format:check` only checks)           |
| `npm test`                   | Run the site and Apps Script tests                    |
| `npm run test:pipeline`      | Run the Python pipeline tests                         |
| `npm run photos:prepare`     | Prepare new photos from `photo-inbox/`                |
| `npm run photos:check`       | Make sure no public photo still carries metadata      |
| `npm run hooks:install`      | Add a pre-commit hook that prepares and checks photos |
| `npm run deploy:apps-script` | Deploy the meeting backend from `origin/main`         |

## Project structure

| Path                 | What it holds                                                 |
| -------------------- | ------------------------------------------------------------- |
| `src/app/`           | Pages: home, guide, about, leaderboard, and the meeting pages |
| `src/components/`    | Shared pieces, including the tile artwork and the guide games |
| `src/lib/site.ts`    | Club details: name, links, photos, the meeting service URL    |
| `src/lib/schema.ts`  | The shape `data/*.json` must have; the build checks it        |
| `data/`              | Generated data: standings, meetings and site wording          |
| `pipeline/`          | Python that reads the Sheets and calendar and writes `data/`  |
| `apps-script/`       | The meeting-night backend, installed in the score workbook    |
| `scripts/`           | Photo and Apps Script deploy helpers                          |
| `.github/workflows/` | Checks, deploys, and the scheduled wording and score updates  |

## Updating the site

| I want to…                    | Do this                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Change wording or officers    | Edit the public site-wording Sheet. A pull request with the change appears on Monday.                                       |
| Change a meeting time or room | Edit the club Google Calendar. The site picks it up the next morning.                                                       |
| Update the leaderboard        | Nothing usually: a pull request with new scores appears after Friday's meeting. Merge it to publish. See [Scores](#scores). |
| Add a photo                   | Put it in `photo-inbox/` and run `npm run photos:prepare`. See [Photos](#photos).                                           |
| Change club links or details  | Edit `src/lib/site.ts`. Club details are never typed into components.                                                       |
| Run check-in at a meeting     | Nothing: it opens itself 30 minutes before each calendar event.                                                             |

### Site wording

The wording comes from a public Google Sheet. Every Monday, a workflow reads it and opens a pull request if anything changed.

- **Never edit `data/site.json` by hand.** It is generated, and hand edits break the tests and build.
- To try wording locally, copy `pipeline/site-content-template.csv`, set `ready_to_publish` and the `.consent` rows to `TRUE` in the copy, and run `npm run data:site -- --input <copy>`.
- A new field touches the template, `TEXT_FIELDS` and the returned dict in `pipeline/build_site_content.py`, `src/lib/site.ts`, and the component that shows it. Add the Sheet row before shipping the code, and remove the code before deleting a row: a row the code needs but the Sheet lacks fails the run.
- The Sheet is public. Never put the roster, legal names, addresses or private contacts in it. List an officer only in the form they agreed to.

### Scores

Scores are counted with playing cards at the table and recorded in the private score workbook. How scoring works is in the [officer guide](OFFICER_GUIDE.md#how-scoring-works).

After scoring closes on Friday night, `.github/workflows/sync-scores.yml` reads the workbook and opens a pull request with the new standings. Review the changes under `data/` and merge it to publish.

To run the same update by hand:

```bash
python3 pipeline/build_data.py --semester fall-2026 --spreadsheet-id <spreadsheet-id>
```

<details>
<summary>First-time setup for running it by hand</summary>

1. Create a Google Cloud project, enable the Google Sheets API, and create a Desktop OAuth client.
2. Save its JSON as `~/.config/mahjongclub-site/google-oauth-client.json` (create the folder with `mkdir -p ~/.config/mahjongclub-site`).
3. Install the Python libraries in a virtual environment:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   python3 -m pip install -r pipeline/requirements.txt
   ```

4. Run the command above. The first run opens Google sign-in for read-only access; the token stays in `~/.config/mahjongclub-site/`, outside the repository.

An OAuth app left in Google's Testing status issues tokens that expire after seven days, so expect to sign in again weekly unless it is published.

</details>

### Photos

Put originals in `photo-inbox/` and run `npm run photos:prepare`. It fixes rotation, resizes to 2400px, strips metadata, saves a WebP copy to `public/photos/`, prints the size to add in `src/lib/site.ts`, and moves the original to `photo-inbox/processed/`.

`photo-inbox/` is never committed, and the checks reject any public image that still carries metadata. See the officer guide for the consent steps before adding anyone's photo.

## Deployment

Every merge to `main` builds the site and publishes it to GitHub Pages. The deploy also runs every morning at 10:00 UTC so calendar changes reach the homepage within a day. For a same-day change, run **Deploy to GitHub Pages** from the Actions tab.

The domain `mahjongclubuva.org` is set by the `NEXT_PUBLIC_SITE_URL` repository variable and the custom domain in the GitHub Pages settings.

Do not deploy anywhere else (such as Vercel): it costs money past hobby use.

## Contributing

1. Work on a branch and open a pull request. Pull requests follow `.github/PULL_REQUEST_TEMPLATE.md`.
2. Before you push, run the same checks as CI:

   ```bash
   npm run lint && npm run format:check && npm test && npm run test:pipeline && npm run photos:check && npm run build
   ```

3. Commit messages and pull request titles use [Conventional Commits](https://www.conventionalcommits.org/) with a scope, such as `feat(guide): …` or `fix(leaderboard): …`.

## License

The code is under the [MIT License](LICENSE).

The license does not cover the club's content: its name and logo, photographs, standings and other data under `data/`, and site copy. These stay with the Mahjong Club at UVA, all rights reserved, because the people in them agreed to appear on this site only.

Third-party parts keep their own terms:

- The rank and guide tile characters in `src/components/glyphs.ts` are baked from [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) (SIL Open Font License 1.1).
- `public/icons/outlook-color.svg` is covered by `public/icons/outlook-color-LICENSE`.
