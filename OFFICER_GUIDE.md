# Officer guide

How to keep the club website current. No coding needed.

## Where to change things

| To change                               | Edit                   | Then                          |
| --------------------------------------- | ---------------------- | ----------------------------- |
| Home or About wording, tagline          | Officer Google Sheet   | GitHub opens a review request |
| Officer names, contact details, socials | Officer Google Sheet   | GitHub opens a review request |
| Meeting time or room                    | Club Google Calendar   | The site refreshes on its own |
| Scores                                  | Private score workbook | A maintainer runs the update  |
| Photos                                  | Private photo inbox    | A maintainer prepares them    |
| Layout, colours, animations, Guide page | Website code           | Ask a maintainer              |

The Sheet is the only place to change wording.
If you're unsure where something belongs, ask before putting it anywhere public.

## Edit the Sheet

1. Edit only the `value` column. Don't touch the `key` column.
2. Only list an officer's name in the exact form they agreed to, and set their `.consent` row to `TRUE`.
3. Set `ready_to_publish` to `TRUE` when the Sheet is ready.

GitHub checks the Sheet once an hour.
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
It refreshes Fridays at 10pm; for a same-week fix, ask a maintainer to run **Refresh meetings** in Actions.

## How scoring works

Points are counted with playing cards and won under Fuzhou scoring.
The leaderboard only adds up points won, so a losing table never lowers anyone's score.
Play 2 tables to be ranked.
The exact rules live in the score workbook and may change.

Scores go through a private process because the workbook and roster hold real names.
Never upload them to GitHub or paste them into a pull request.
Players who opt out are removed before anything is published.
The maintainer can read the private Google Sheet with the read-only API importer or use the downloaded workbook as before.
The importer writes only the generated public leaderboard files; review those files in a pull request, then merge to deploy.
The website-copy Sheet remains separate and continues to create its own review pull request automatically.

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
