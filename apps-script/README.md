# Meeting backend

The meeting-night pages (check-in, tables, live standings) talk to a Google Apps Script web app bound to the private score workbook. This folder is its code. Setup and redeploying are in the [officer guide](../OFFICER_GUIDE.md#meeting-check-in-backend); this page explains how it behaves. `npm run deploy:apps-script` deploys it, always from `origin/main`, never your working copy.

## Meeting pages

Players scan a QR code to [mahjongclubuva.org/checkin/](https://mahjongclubuva.org/checkin/), which opens check-in directly; the other meeting pages live under `/meeting/`. These pages are unlisted and not indexed.

| Page                | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `/meeting/`         | Same as check-in, so a QR code lands on the ID slots     |
| `/meeting/checkin/` | Check in by computing ID; new players add a name         |
| `/meeting/tables/`  | The live lobby of tables in play                         |
| `/meeting/table/N/` | One physical table (1 to 12): seats, games, End table    |
| `/meeting/tonight/` | Tonight's standings, and the semester with tonight added |
| `/meeting/score/`   | Fallback: type a table's four final totals               |

`/score/`, `/live/` and `/tables/` are forwarding pages for old links. Static export has no server redirects, so they use a meta refresh.

- The web app's URL is `MEETING_SERVICE_URL` in `src/lib/site.ts`. Redeploying the script under a new owner changes the URL, but the QR codes never need reprinting because they point at the site.
- `MEETING_REHEARSAL` adds a "fake names only" banner for testing against a throwaway workbook. Keep it `false` while the URL points at the real workbook.
- Until the Apps Script with table rooms is deployed, the meeting response has no `rooms` field, and every page falls back to typed final totals.

## How a table works

- **Meeting session:** everyone checked in tonight, recorded in the Attendance tab.
- **Physical table:** a numbered table in the room, 1 to 12. Its number never changes.
- **Table session:** one group's run of games at a physical table, from the first seat taken until someone taps End table. Each session has a number that goes up every time the table is ended.
- **Game:** one reported win. The winner gains three times what each other player pays, and the other three each pay it, so a game always sums to zero. Everyone starts a session at 205. Code calls games `hands`.

What players see at a table is in the [officer guide](../OFFICER_GUIDE.md#tables-on-the-night). The rules the backend enforces:

- A player belongs to one table at a time; a second seat is refused.
- Games can be saved only once all four seats are taken; any of the four can save one. A player can leave alone only while the session has no games; after that, only End table, which releases all four.
- End table writes the four totals as one `Table N` block in Points Tracking, the same as a typed-totals save, and starts the next session at the same table. A session with no games writes nothing, and one still open when scoring closes is saved on the next request.

The workbook has no per-game rows. Games live in Script Properties (one key per table, `room:<meeting>:<table>`) until the table ends. The scoresheet block number ("scoresheet Table 8") is not the physical table number.

## Who owns what

- **The Apps Script owns** check-in, table membership, games and saved results. Every write runs under one script lock.
- **Each phone keeps only conveniences:** who it is (localStorage, scoped to tonight's meeting), whether that was confirmed this visit (sessionStorage), an unfinished game entry, and pending typed-totals saves.
- **Concurrency rules:**
  - Each game carries a random ID, so a retry while that game remains in the session never counts twice.
  - Game saves and Undo name the original physical table and session, so a delayed request cannot land in a new group.
  - Deploy the frontend before updating Apps Script for this request contract.
    Older backends accept the extra fields; after the backend update, older open pages must reload before saving or undoing games.
  - Every change sends the last game the phone saw, so a stale screen is refused rather than recorded. (Reads take no lock, so a table ended mid-refresh can show twice in one phone's standings for one refresh; saved results are never duplicated.)
  - End carries the session number, so a repeated End returns the same save even after everyone was released.
  - The workbook submission ID for a session is never sent to phones.

## Recovery

| Situation                 | What happens                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Refresh                   | The player and table come back from the server; an unfinished game entry is restored if the table has not moved on |
| Browser reopened          | "Continue as Name?" before acting as the last player                                                               |
| Storage cleared           | Entering the computing ID again finds the existing seat; no duplicate player                                       |
| Connection lost           | The last known table stays visible with "Reconnecting"; Save game and End table wait                               |
| Reply lost during a save  | The phone checks whether the game landed before offering a retry                                                   |
| Table ended while away    | The final receipt shows, with "Find another table"                                                                 |
| Another phone saved first | The entry is cleared with a note if it was the same game, or kept with a warning if different                      |

## Logs and caches

After a meeting, **Extensions → Apps Script → Executions** shows one log line per request, such as `{"request":"POST rooms hand","status":200,"ms":840,"lockMs":12}`: its kind, outcome, duration and time spent waiting for the write lock. These lines never include names, IDs or scores. They are the measurements for deciding whether the meeting backend needs to move off Apps Script.

Check-in keeps a 30-second list of known computing IDs and a five-minute cache of upcoming calendar events in Apps Script (opening times are rechecked on every request). Both are hints: check-in and sign-up reread the roster under the lock before saving. The details are commented in `Club.gs`. Changes there need the Apps Script deployment updated, and local tests say nothing about Google's response times.

## Testing

`npm test` runs `club.test.mjs` against an in-memory stand-in for the workbook. To rehearse without touching the real workbook, run that harness behind a local server, never the live URL.
