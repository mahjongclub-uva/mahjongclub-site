# Table recovery browser regressions

Start the local app with `npm run dev`, then run this suite with an existing Playwright installation.
Every meeting service request is intercepted before navigation, and other external requests are blocked.
The suite does not contact the real workbook.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
BROWSER_EXECUTABLE=/absolute/path/to/chrome \
MEETING_TEST_URL=http://localhost:3000 \
node --test tests/meeting/table-recovery.mjs
```

When `playwright` is already resolvable and its browser is installed, only the final command is needed.
The suite checks delayed reads after Undo, a saved Undo whose reply was lost, and a lost request that did not change the table.
