# Mahjong Club @ UVA website

The website for the Mahjong Club at UVA, live at **[mahjongclubuva.org](https://mahjongclubuva.org/)**.
It tells people when and where the club meets, teaches the game with small playable lessons, shows the season leaderboard, and runs check-in and scoring on meeting nights.

- **Officers:** you don't need any of this page. Start with the [officer guide](OFFICER_GUIDE.md).
- **Maintainers:** this page explains how the site is built and how to change it.

## How it fits together

```text
Score workbook (private Sheet) ─┐
Site wording (public Sheet) ────┼─▶ pipeline/ (Python) ─▶ data/*.json ─▶ Next.js static site ─▶ GitHub Pages
Club Google Calendar ───────────┘

Meeting night: table QR code ─▶ /checkin/ ─▶ Apps Script web app ─▶ score workbook
```

A few rules shape everything else:

- **Nothing costs money.** The site is static files on GitHub Pages; there is no server or database to keep running.
- **The Google Sheets are the source of truth.** The pipeline reads them and never writes to them. `data/*.json` is the only thing the website reads.
- **Real names never enter this repository.** They live in the score workbook's private Roster tab; the site only ever sees short display names like "Kevin J.".

## Run it locally

You need Node 22 and Python 3.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Before you commit, run the same checks as CI:

```bash
npm run lint
npm run format:check
npm test
npm run test:pipeline
npm run photos:check
npm run build
```

`npm run format` fixes formatting. `npm run hooks:install` adds a pre-commit hook that prepares and checks photos.

Commit messages and pull request titles use [Conventional Commits](https://www.conventionalcommits.org/) with a scope, such as `feat(guide): …` or `fix(leaderboard): …`. Pull requests follow the template in `.github/PULL_REQUEST_TEMPLATE.md`.

## Common jobs

| I want to…                          | Do this                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Change wording on the site          | Edit the public site-copy Sheet. A pull request with the change appears on Monday ([Site wording](#site-wording)). |
| Change a meeting time or room       | Edit the club Google Calendar. The site picks it up the next morning ([Deploys](#deploys)).                        |
| Update the leaderboard              | Run the score pipeline and open a pull request ([Scores](#scores)).                                                |
| Change the logo, calendar or photos | Edit `src/lib/site.ts`. Club details are never typed into components.                                              |
| Add a photo                         | Put it in `photo-inbox/` and run `npm run photos:prepare` ([Photos](#photos)).                                     |
| Run check-in at a meeting           | Nothing to do: it opens itself 30 minutes before each calendar event ([Meeting nights](#meeting-nights)).          |
| Change the officer list             | Edit it in the public site-copy Sheet, like other wording. Only list someone in the form they agreed to.           |

## Site wording

```text
public Sheet → pipeline/build_site_content.py → data/site.json → src/lib/site.ts → components
```

- **Never edit `data/site.json` by hand.** It is generated, and hand edits break the tests and build.
- Every Monday a workflow reads the Sheet (published to the web as CSV, URL in the `SITE_CONTENT_CSV_URL` repository variable) and opens a pull request if anything changed.
- To try wording locally, copy `pipeline/site-content-template.csv`, set `ready_to_publish` and the `.consent` rows to `TRUE` in the copy, and run `npm run data:site -- --input <copy>`.
- Adding a new field touches the template, `TEXT_FIELDS` and the returned dict in `build_site_content.py`, `src/lib/site.ts`, and the component that shows it.
- Add a row to the Sheet before shipping the code that needs it, and remove the code before deleting a row. A row the code needs but the Sheet lacks fails the run.

The published Sheet is public. Never put the roster, legal names, addresses or private contacts in it.

## Scores

Scores are counted with playing cards at the table and recorded in the private score workbook. The pipeline turns them into the public leaderboard data. How scoring works is in the [officer guide](OFFICER_GUIDE.md#how-scoring-works).

The automatic Saturday sync (`.github/workflows/sync-scores.yml`) is not switched on yet, so a maintainer updates the leaderboard by hand:

```bash
python3 pipeline/build_data.py --source sheets --semester fall-2026 --spreadsheet-id <spreadsheet-id>
```

Review the changes under `data/` and open a pull request. Merging it publishes the new standings.

**First-time setup** on a maintainer computer that can open the workbook:

1. Create a Google Cloud project, enable the Google Sheets API, and create a Desktop OAuth client.
2. Save its JSON as `~/.config/mahjongclub-site/google-oauth-client.json` (create the folder with `mkdir -p ~/.config/mahjongclub-site`).
3. Install the optional libraries in a virtual environment:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   python3 -m pip install -r pipeline/requirements.txt
   ```

4. Run the command above. The first run opens Google sign-in for read-only spreadsheet access; the token stays in `~/.config/mahjongclub-site/`, outside the repository.

An OAuth app left in Google's Testing status issues tokens that expire after seven days, so expect to sign in again weekly unless it is published.

Fall 2025 is test data on an older rule and still reads names from the gitignored `pipeline/roster.local.json`. Leave it alone.

## Meeting nights

Players scan a QR code to [mahjongclubuva.org/checkin/](https://mahjongclubuva.org/checkin/), which forwards to the meeting pages under `/meeting/`. These pages are unlisted and not indexed.

| Page                  | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `/meeting/`           | Who this phone is, and the next step                     |
| `/meeting/checkin/`   | Check in by computing ID; new players add a name         |
| `/meeting/tables/`    | The live lobby of tables in play                         |
| `/meeting/table/N/`   | One physical table (1 to 12): seats, games, End table    |
| `/meeting/standings/` | Tonight's standings, and the semester with tonight added |
| `/meeting/score/`     | Fallback: type a table's four final totals               |

`/checkin/`, `/score/`, `/live/` and `/tables/` are forwarding pages for old links and printed QR codes. Static export has no server redirects, so they use a meta refresh.

- The pages talk to a Google Apps Script web app bound to the score workbook. Its code is in `apps-script/`, and setup is in the [officer guide](OFFICER_GUIDE.md#meeting-check-in-backend).
- Its URL is `MEETING_SERVICE_URL` in `src/lib/site.ts`. Redeploying the script under a new owner changes the URL, but the QR codes never need reprinting because they point at the site.
- `MEETING_REHEARSAL` adds a "fake names only" banner for testing against a throwaway workbook. Keep it `false` while the URL points at the real workbook.
- Until the Apps Script with table rooms is deployed, the meeting response has no `rooms` field, and every page falls back to typed final totals.

### How a table works

- **Meeting session:** everyone checked in tonight, recorded in the Attendance tab.
- **Physical table:** a numbered table in the room, 1 to 12. Its number never changes.
- **Table session:** one group's run of games at a physical table, from the first seat taken until someone taps End table. Each session has a number that goes up every time the table is ended.
- **Game:** one reported win. The winner gains three times what each other player pays, and the other three each pay it, so a game always sums to zero. Everyone starts a session at 205. Code calls games `hands`.

The lifecycle:

1. A checked-in player takes a wind seat (East, South, West or North) at a table. A player belongs to one table at a time; the backend refuses a second.
2. Once all four seats are taken, any of the four reports a game: winner, what each other player pays, a review of every change, then Save game.
3. A player can leave alone only while the session has no games. After that, only End table, which affects all four.
4. End table writes the session's four totals as one `Table N` block in Points Tracking, the same as a typed-totals save. It releases all four players and starts the next session at the same table. A session with no games writes nothing.
5. When scoring closes, any session with games is saved the same way on the next request.

The workbook has no per-game rows. Games live in Script Properties (one key per table, `room:<meeting>:<table>`) until the table ends. The scoresheet block number ("scoresheet Table 8") is not the physical table number.

### Who owns what

- **The Apps Script owns** check-in, table membership, games and saved results. Every write runs under one script lock.
- **Each phone keeps only conveniences:** who it is (localStorage, scoped to tonight's meeting), whether that was confirmed this visit (sessionStorage), an unfinished game entry, and pending typed-totals saves.
- **Concurrency rules:**
  - Each game carries a random ID, so a retry never counts twice.
  - Every change sends the last game the phone saw, so a stale screen is refused rather than recorded. (Reads take no lock, so a table ended mid-refresh can show twice in one phone's standings for one refresh; saved results are never duplicated.)
  - End carries the session number, so a repeated End returns the same save even after everyone was released.
  - The workbook submission ID for a session is never sent to phones.

### Recovery

| Situation                 | What happens                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Refresh                   | The player and table come back from the server; an unfinished game entry is restored if the table has not moved on |
| Browser reopened          | "Continue as Name?" before acting as the last player                                                               |
| Storage cleared           | Entering the computing ID again finds the existing seat; no duplicate player                                       |
| Connection lost           | The last known table stays visible with "Reconnecting"; Save game and End table wait                               |
| Reply lost during a save  | The phone checks whether the game landed before offering a retry                                                   |
| Table ended while away    | The final receipt shows, with "Find another table"                                                                 |
| Another phone saved first | The entry is cleared with a note if it was the same game, or kept with a warning if different                      |

After a meeting, **Extensions → Apps Script → Executions** shows one log line per request, such as `{"request":"POST rooms hand","status":200,"ms":840,"lockMs":12}`: its kind, outcome, duration and time spent waiting for the write lock. These lines never include names, IDs or scores. They are the measurements for deciding whether the meeting backend needs to move off Apps Script.

To rehearse without touching the real workbook, run the in-memory harness used in `apps-script/club.test.mjs` behind a local server, never the live URL.

## Deploys

Every merge to `main` builds the site and deploys it to GitHub Pages. The deploy also runs every morning at 10:00 UTC to read the club calendar, so a changed meeting reaches the homepage within a day with no commit. For a same-day change, run **Deploy to GitHub Pages** from the Actions tab.

The site is served at `mahjongclubuva.org`, set by the `NEXT_PUBLIC_SITE_URL` repository variable and the custom domain in the GitHub Pages settings.

## Photos

Put originals in `photo-inbox/` and run `npm run photos:prepare`. It fixes orientation, resizes to 2400px, strips metadata, writes WebP files to `public/photos/`, prints the size to add in `src/lib/site.ts`, and moves the original to `photo-inbox/processed/`.

All of `photo-inbox/` is gitignored, and CI rejects any public image that still carries metadata. See the officer guide for the consent steps before adding anyone's photo.

## Where things live

| Path                 | What it holds                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `src/app/`           | Pages: home, guide, about, leaderboard, and the meeting pages                            |
| `src/components/`    | Shared pieces, including the tile artwork and the guide games                            |
| `src/lib/site.ts`    | Club details, photos and the meeting service URL, plus the wording from `data/site.json` |
| `src/lib/schema.ts`  | The shape `data/*.json` must have; the build checks it                                   |
| `data/`              | Generated public data: standings, meetings and site wording                              |
| `pipeline/`          | Python that reads the Sheets and calendar and writes `data/`                             |
| `apps-script/`       | The meeting check-in web app, installed in the score workbook                            |
| `.github/workflows/` | Checks, deploys, and the scheduled site-wording and score jobs                           |

## License

The code is under the [MIT License](LICENSE).
The license does not cover the club's content: its name and logo, photographs, standings and other data under `data/`, and site copy. These stay with the Mahjong Club at UVA, all rights reserved, because the people in them agreed to appear on this site only.

Third-party parts keep their own terms:

- The rank and guide tile characters in `src/components/glyphs.ts` are baked from [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) (SIL Open Font License 1.1).
- `public/icons/outlook-color.svg` is covered by `public/icons/outlook-color-LICENSE`.
