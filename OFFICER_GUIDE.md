# Officer guide

How to keep the club website current. No coding needed.

## Where to change things

| To change                               | Edit                   | Then                          |
| --------------------------------------- | ---------------------- | ----------------------------- |
| Home or About wording, tagline          | Officer Google Sheet   | GitHub opens a review request |
| Officer names, contact details, socials | Officer Google Sheet   | GitHub opens a review request |
| Meeting time or room                    | Club Google Calendar   | The site updates within a day |
| Scores                                  | Private score workbook | A maintainer runs the update  |
| Photos                                  | Private photo inbox    | A maintainer prepares them    |
| Layout, colours, animations, Guide page | Website code           | Ask a maintainer              |

The Sheet is the only place to change wording.
If you're unsure where something belongs, ask before putting it anywhere public.

## Edit the Sheet

1. Edit only the `value` column. Don't touch the `key` column.
2. Only list an officer's name in the exact form they agreed to, and set their `.consent` row to `TRUE`.
3. Set `ready_to_publish` to `TRUE` when the Sheet is ready.

GitHub checks the Sheet every Monday.
A maintainer can also start the check from the repository's **Actions** page.

If the content passes, GitHub opens a pull request called **Website content update**.
Later edits update that same pull request.
If something is wrong, GitHub opens an issue called **Website content update is failing** explaining why, and closes it once it's fixed.

## Review and publish

1. Open the **Website content update** pull request.
2. Check the table of changes and the **Files changed** tab: wording, names, email, location, links.
3. Merge it. The site updates a few minutes later.

Leaving `ready_to_publish` on `TRUE` is fine; nothing happens while the Sheet matches the site.

## Meetings

The homepage reads upcoming meetings from the club's public Google Calendar.
Use real times, put only a public building and room in the location, and delete cancelled meetings.
The site rebuilds every morning and reads the calendar then, so a change shows up within a day.
For a same-day fix, ask a maintainer to run **Deploy to GitHub Pages** in Actions.

## How scoring works

Points are counted with playing cards and won under Fuzhou scoring.
For Fall 2026, everyone starts at 205 season points. Each recorded table's net result is added to or subtracted from that season score.
One completed table is enough to appear in the standings.
The exact rules live in the score workbook and may change.

Scores go through a private process because the workbook and roster hold real names.
Never upload them to GitHub or paste them into a pull request.
Players who opt out are removed before anything is published.
The maintainer can read the private Google Sheet with the read-only API importer or use the downloaded workbook as before.
The importer writes only the generated public leaderboard files; review those files in a pull request, then merge to deploy.
The website-copy Sheet remains separate and continues to create its own review pull request automatically.

## Meeting check-in backend

The check-in and score entry pages write to the Fall 2026 score workbook, starting with the October 9 meeting.
Automatic score publishing is not enabled yet: the public leaderboard updates when scores are synced, and `/live/` shows the night's provisional standings in the meantime.
If the pages misbehave during a meeting, record attendance and tables in the Sheet as before.

### Install and configure

1. In the score workbook, open **Extensions > Apps Script**.
2. Add the code from `apps-script/Rules.gs` and `apps-script/Club.gs` as script files named `Rules` and `Club`.
3. Add `apps-script/Settings.html` as an HTML file named `Settings`.
4. In **Project Settings**, enable the manifest editor and replace `appsscript.json` with `apps-script/appsscript.json`.
5. Save, run `onOpen`, and return to the workbook.
6. Open **Club > Settings** and enter the calendar ID, semester dates, and the exact Attendance and Points Tracking tab names.
7. Run **Club > Set up** and grant the requested permissions as the account that will own the deployment.
8. Deploy a new **Web app**, executing as yourself with access for **Anyone**, and save its `/exec` URL privately.

Set the workbook timezone to America/New_York.
There is no timer. A meeting opens when the first person visits during its window, and may open up to five minutes late because the calendar is checked at most every five minutes. Every timed event is a meeting; all-day events are ignored.
The website's meeting banner follows `data/meetings.json`, so a meeting opened with **Open now** works from the QR or `/checkin/` link but shows no banner.
Overlapping meeting windows are refused.
Set up is safe to repeat. It removes the every-minute `clubTick` timer that earlier versions created and leaves other timers alone.
The script stays bound to the workbook, while Set up stores the workbook ID so web requests can open it explicitly.

The Attendance tab needs `Member` and `# Meets` in A/B, date headers from D onward, checkbox cells, and at least one member row with a `# Meets` formula.
Points Tracking needs distinct `Table N` blocks in B:E, a `Player | Points | Net | date` header, and four player rows.
An empty block can have existing Net formulas evaluating to -205; those formulas are preserved.
Columns G onward are never written.
When all templates are full, an officer must add another correctly numbered block.

**Club > Open now** opens a two-hour manual meeting, followed by the configured score grace period.
**Club > Close now** immediately closes check-in and scores and prevents the same calendar event reopening.
For a visitor without a computing ID, add a unique `player_id`, full name, short name and opt-out checkbox to Roster, select that row, and choose **Club > Check in selected member**.
You can also select their existing Attendance row.
**Club > Recheck** validates filled tables against roster names, attendance, whole totals, the 820 total, and Net values, and highlights invalid blocks in pale red.
Recheck does not alter scores or start publishing.

### Public-name suggestions

Suggestions are disabled until a maintainer installs a snapshot of published short names.
They never use private Roster rows alone as evidence that someone is public.
Generate that snapshot from the committed public leaderboard data:

```bash
node --input-type=module - <<'JS'
import fs from 'node:fs';
const players = new Map();
for (const file of fs.readdirSync('data/semesters').filter(file => file.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync('data/semesters/' + file));
  for (const player of [...data.standings, ...data.unranked]) {
    players.set(player.id, { id: player.id, display: player.display });
  }
}
console.log(JSON.stringify([...players.values()]));
JS
```

With the meeting closed, edit the `settings` Script property in **Project Settings** and replace only its `publishedPlayers` array with this output.
Use fake published players for the rehearsal, never the real roster.
Refresh the snapshot after new official standings are published.
Current opt-outs and claimed rows are excluded even if they appear in an older snapshot.

### Rehearsal and request contract

Use a new private workbook with fake names and the layouts above, including blank rows with checkboxes and empty tables with Net formulas.
Use a test calendar with an event for the rehearsal date.
Run Set up and confirm no `clubTick` timer remains for your account.
Test calendar opening, the check-in cutoff, the score grace period, and Close now.
Confirm the exact row, checkbox, formula and table cells after each write, including that G onward stayed unchanged.
Also try one unscheduled date and one newcomer.

Every response is JSON with a numeric `status`; read that field even when transport status is 200.
Send POST bodies as `text/plain` to avoid a browser preflight.

| Request                                                               | Fields and response                                                                                                  |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET ?r=meeting`                                                      | Public `open`, `checkinsOpen`, `meetingId`, `date`, `semester`; includes the checked-in lobby during an open meeting |
| `GET ?r=results`                                                      | Tonight's tables, opaque ids, short names, totals and nets; cached for 30 seconds                                    |
| `POST {r:"checkins", computingId}`                                    | Returning-player check-in; 404 means the name registration form is needed                                            |
| `POST {r:"players", computingId, fullName}`                           | Claims an exact unclaimed name or creates a player; 409 with `suggestions` asks the player to confirm                |
| `POST {r:"players", computingId, fullName, matchId}`                  | Confirms one offered public suggestion; `createNew:true` declines the suggestions instead                            |
| `POST {r:"results", meetingId, submissionId, seats:[{id,total},...]}` | Four checked-in players, whole totals summing to 820; 201 on first save, 200 on an identical retry                   |

Use one random submission ID per table and retain it until the receipt arrives.
Receipts reserve a Table N block using its heading cell note before writing, so a retry after a write failure uses the same block.
Do not remove those notes during corrections.
Try a repeated submission, changed totals with the same ID, repeated player, fractional total, incorrect sum, unchecked player, stale meeting and closed meeting.
None of the rejected cases should fill another table.
Check the request from a phone browser as well as locally, since local tests cannot verify Google's deployment, redirects or cross-origin behavior.
Opted-out players use an anonymous `Player pNNN` label in the lobby and results.
Full names and computing IDs are never included in responses.

## Meeting pages

The unlisted pages are `/checkin/`, `/score/`, and `/live/`.
They are excluded from the public navigation and sitemap and marked noindex.
The endpoint and rehearsal notice are configured by `MEETING_SERVICE_URL` and `MEETING_REHEARSAL` in `src/lib/site.ts`.
Rehearsal mode adds a "fake names only" banner and keeps live standings apart from the real season; turn it on only when the URL points at a test workbook.

A table QR links directly to `/checkin/`; no meeting code is required.
The same check-in and score pages are available from the website while a meeting is open.
Anyone with the URL can check in and submit a valid table during that window, including remotely.
Computing IDs identify roster entries but are not a sign-in or proof of attendance.
The site does not store computing IDs or full names.
The floating meeting link shows the date and returns players to their score draft after visiting the Guide or homepage.
Existing QR links containing an old `k` parameter still work; that parameter is ignored.
Deploy the updated Apps Script backend before the code-free website; the old backend still requires a code.
Players without a computing ID still check in through an officer in the Sheet.

The score page lists only tonight's checked-in short names, prevents repeated players, and requires four whole ending totals summing to 820.
Select four short-name chips, then type ending totals or tap each card in the optional keypad.
Undo last card and Clear cards correct counting mistakes before applying a total.
Before sending a table, the page stores its opaque player IDs, totals, meeting ID and random submission ID in session storage.
If the response is lost or the page reloads, retry the same save; the players and totals stay locked until a receipt arrives.
If an unconfirmed save belongs to an earlier meeting, an officer must check the Sheet before the submitter starts over.
Corrections to confirmed results are officer edits in the Sheet.
The receipt links to `/live/`, which adds tonight’s scores to the official season snapshot and shows rank movement.
The regular leaderboard remains the official snapshot until the publishing pipeline updates it.

If the site is unavailable, an officer records attendance and results directly in the Sheet.

## Photos

Get permission from everyone identifiable before a photo goes up.
Originals stay private; a maintainer strips their metadata before publishing.

## Keep private

Never publish home addresses, phone numbers, passwords or private links, or anyone's name or photo without their permission.
When in doubt, leave it out and ask.
If private information does get published, tell the repository owner straight away; deleting the file doesn't remove it from the history.

## If something goes wrong

- **No pull request after editing the Sheet:** check `ready_to_publish` is `TRUE`, no value is blank, and every listed officer has consent `TRUE`. Look for a **Website content update is failing** issue.
- **The site still shows old information:** check the pull request was merged and **Deploy to GitHub Pages** finished in Actions, then refresh the page.
