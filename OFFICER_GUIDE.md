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

## Instagram story

Every deploy redraws the weekly leaderboard story from the published standings.
After the score update is merged and the site has updated, open `/story.png` on the site on your phone, long-press the image and save it, then post it.
If it still shows last week's date, wait ten minutes and reload; the old copy can be cached that long.

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
Automatic score publishing is not enabled yet: the public leaderboard updates when scores are synced, and `/meeting/tonight/` shows the night's provisional standings in the meantime.
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

### Updating the script

After a change to `apps-script/` merges, deploy it outside a meeting from a computer with this repository.

1. Once per computer: turn on **Google Apps Script API** at script.google.com/home/usersettings, run `npx @google/clasp@3.4.1 login` as the account that owns the deployment, and put the Script ID from **Project Settings** in the editor into a file named `.apps-script-id` in the repository root. Git ignores that file. Run this from macOS or Linux.
2. Run `npm run deploy:apps-script`. It deploys `origin/main`, never your working copy, refuses while a meeting is open, shows what the push will replace, and asks before it pushes. The push replaces every file in the script project with `Rules`, `Club`, `Settings` and `appsscript.json`, and the deployment keeps its `/exec` URL.

Without clasp, paste each file from `origin/main` into the editor, then use **Deploy > Manage deployments**, edit the web app, and choose **New version**.

The Attendance tab needs `Member` and `# Meets` in A/B, date headers from D onward, checkbox cells, and at least one member row with a `# Meets` formula.
Points Tracking needs distinct `Table N` blocks in B:E, a `Player | Points | Net | date` header, and four player rows.
An empty block can have existing Net formulas evaluating to -205; those formulas are preserved.
F of each `Table N` row holds how many games that table played; keep it empty in templates.
The script adds a `Games` tab on its first saved table, one row per game; leave its name and rows as they are.
Columns G onward are never written.
When all templates are full, an officer must add another correctly numbered block.

**Club > Open now** opens a two-hour manual meeting, followed by the configured score grace period.
**Club > Close now** immediately closes check-in and scores and prevents the same calendar event reopening.
Closing saves every table that still has games. If one cannot be saved, for example because every template block is full, Close names it with each player's total. Fix the cause and run Close again; do not type the totals in, because the script keeps retrying and would save the table twice.
Only for a table that can never save: check Points first, enter it by hand, then delete its `room:<meetingId>:<table>` entry under Project Settings › Script properties.
For a visitor without a computing ID, add a unique `player_id`, full name, short name and opt-out checkbox to Roster, select that row, and choose **Club > Check in selected member**.
You can also select their existing Attendance row.
If a newcomer sees "Your name is taken", add a Roster row with a unique `player_id`, their full name exactly as they type it, and a short name nobody else has, such as a nickname. Leave `computing_id` empty: their next **Join the club** with that name claims the row.
**Club > Recheck** validates filled tables against roster names, attendance, whole totals, the 820 total, and Net values, and highlights invalid blocks in pale red.
Recheck also lists any table whose games were never saved, including one left from an earlier meeting, with each player's total.
Recheck does not alter scores or start publishing.

### Public-name suggestions

Suggestions offer only names that are already public: anyone who appears in a semester's Points Tracking, since playing a scored game is what publishes a player.
They never use private Roster rows alone as evidence that someone is public, and opted-out players are never suggested.

### Rehearsal and request contract

Use a new private workbook with fake names and the layouts above, including blank rows with checkboxes and empty tables with Net formulas.
Use a test calendar with an event for the rehearsal date.
Run Set up and confirm no `clubTick` timer remains for your account.
Test calendar opening, the check-in cutoff, the score grace period, and Close now.
Confirm the exact row, checkbox, formula and table cells after each write, including that G onward stayed unchanged.
Also try one unscheduled date and one newcomer.

Every response is JSON with a numeric `status`; read that field even when transport status is 200.
Send POST bodies as `text/plain` to avoid a browser preflight.

| Request                                                               | Fields and response                                                                                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET ?r=meeting`                                                      | Public `open`, `checkinsOpen`, `meetingId`, `date`, `semester`; includes the checked-in lobby during an open meeting               |
| `GET ?r=results`                                                      | Tonight's tables, opaque ids, short names, totals and nets; cached for 30 seconds                                                  |
| `POST {r:"checkins", computingId}`                                    | Returning-player check-in; 404 means the name registration form is needed                                                          |
| `POST {r:"players", computingId, fullName}`                           | Claims an exact unclaimed name or creates a player; 409 with `suggestions` asks the player to confirm                              |
| `POST {r:"players", computingId, fullName, matchId}`                  | Confirms one offered public suggestion; `createNew:true` declines the suggestions instead                                          |
| `POST {r:"results", meetingId, submissionId, seats:[{id,total},...]}` | Four checked-in players, whole totals summing to 820; 201 on first save, 200 on an identical retry                                 |
| `POST {r:"tile", playerId, tile:"face.back"}`                         | A checked-in player's tile for tonight, returned as `tiles` with the lobby and the rooms; no lock, nothing written to the workbook |

Use one random submission ID per table and retain it until the receipt arrives.
Receipts reserve a Table N block using its heading cell note before writing, so a retry after a write failure uses the same block.
Do not remove those notes during corrections.
Try a repeated submission, changed totals with the same ID, repeated player, fractional total, incorrect sum, unchecked player, stale meeting and closed meeting.
None of the rejected cases should fill another table.
Check the request from a phone browser as well as locally, since local tests cannot verify Google's deployment, redirects or cross-origin behavior.
Opted-out players use an anonymous `Player pNNN` label in the lobby and results.
Full names and computing IDs are never included in responses.

## Meeting pages

The meeting pages live under `/meeting/` and are unlisted, out of the sitemap and marked noindex.
The QR codes point at `/checkin/`, which opens check-in directly, the same as `/meeting/` and `/meeting/checkin/`.
The endpoint and rehearsal notice are configured by `MEETING_SERVICE_URL` and `MEETING_REHEARSAL` in `src/lib/site.ts`.
Rehearsal mode adds a "fake names only" banner and keeps live standings apart from the real season; turn it on only when the URL points at a test workbook.

Anyone with the URL can check in during a meeting, including remotely.
Computing IDs identify roster entries but are not a sign-in or proof of attendance.
The site does not store computing IDs or full names.
Players without a computing ID still check in through an officer in the Sheet.

### Tables on the night

Players sit at a numbered table and take the wind seat they are sitting in.
After each game, any of the four taps who won and what each other player pays; the app works out everyone's change.
When the group is done, or someone has to leave, one of them taps **End table**.
That saves the group's four totals as one `Table N` block in Points Tracking, with the number of games in F beside `Table N`, and frees all four seats for the next group.
When you type a table in by hand, put just the number of games (for example `12`) in that cell if you know it; the leaderboard counts games only from tables that have one.
Ending a table with no games saves nothing.
If scoring closes with a table still in play, its totals are saved automatically.

- **Add empty Table blocks before the meeting.** Every ended table with games uses one block. If they run out, End table is refused until an officer adds more, and the games stay safe in the meantime.
- **"Scoresheet Table 8" is the block in the sheet,** not the physical table number. It is what the receipt shows so you can find the row.
- **A player who walked away:** the rest of the table taps End table. Nobody can join a second table while still seated at one.
- **Corrections** to saved results are officer edits in the Sheet. A wrong game can be undone at the table until the table ends.

Tables without a phone can still be entered as four final totals at `/meeting/score/`.
That form requires four checked-in players and totals that add up to 820, and keeps a retry receipt if the connection drops.
Players seated at a table are marked there, so the same games are not entered twice.

`/meeting/tonight/` shows tonight's nets (games at tables still playing are included and marked provisional) and the semester with tonight added.
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
