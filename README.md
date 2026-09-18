# Mahjong Club @ UVA website

## Officer content workflow

Officers can update public website copy in Google Sheets without editing code.
The sheet is read-only from GitHub: it can propose a pull request, but it cannot publish directly.
A maintainer reviews and merges the pull request to publish through the existing GitHub Pages workflow.

### One-time setup

1. Import `pipeline/site-content-template.csv` into a new Google Sheet.
2. Protect the `key` column and give officers edit access to the `value` column.
3. Use **File → Share → Publish to web**, select that tab, and choose **Comma-separated values (.csv)**.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**.
5. Add a repository variable named `SITE_CONTENT_CSV_URL` containing the published CSV URL.
6. Under **Settings → Actions → General → Workflow permissions**, allow GitHub Actions to create pull requests.

The published sheet must contain only information intended for the public website.
Never add the private roster, legal names used only for score processing, personal addresses, or private contact information.

### Publishing an update

1. Edit values in the Sheet without changing the keys.
2. Confirm permission for every officer name and set that role's `.consent` row to `TRUE`.
3. Set `ready_to_publish` to `TRUE`.
4. Wait for the hourly check, or open **Actions → Propose website content update → Run workflow**.
5. Open the generated **Website content update** pull request and review **Files changed**.
6. Merge the pull request to publish the update.

Leaving `ready_to_publish` as `TRUE` is safe.
After an update is merged, later checks do nothing until the sheet content changes again.

The workflow manages homepage and About copy, officer display names, public contact details, and social links.
Scores remain in the private roster pipeline, meetings remain in Google Calendar, and photos remain a manual consent and metadata-review process.
