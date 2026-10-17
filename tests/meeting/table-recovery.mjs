import assert from "node:assert/strict";
import { after, test } from "node:test";

// Use an existing Playwright installation without adding it to the app bundle.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
after(() => browser.close());
const base = new URL(process.env.MEETING_TEST_URL || "http://localhost:3000");
const players = ["Alex", "Blair", "Casey", "Drew"].map((display, index) => ({
  id: `p00${index + 1}`,
  display,
}));
const initialHands = [
  { id: "aaaaaaaaaaaaaaaa", winner: "p001", each: 10 },
  { id: "bbbbbbbbbbbbbbbb", winner: "p002", each: 20 },
];

async function fixture(t) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  t.after(() => page.close());
  const room = {
    table: 1,
    session: 1,
    seats: players.map((player, wind) => ({ ...player, wind })),
    hands: structuredClone(initialHands),
    totals: [],
    ended: null,
  };
  const state = () => ({
    status: 200,
    rooms: [structuredClone(room)],
    results: [],
  });
  let holdNextRead = false;
  let delayed;
  let loseUndo = false;
  let applyUndo = true;
  let undos = 0;
  const unmockedWrites = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  t.after(() => {
    assert.deepEqual(unmockedWrites, []);
    assert.deepEqual(pageErrors, []);
  });
  // Install before navigating: this suite never sends a request to Google.
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === "script.google.com") {
      if (request.method() === "POST") {
        const data = JSON.parse(request.postData());
        assert.equal(data.action, "undo");
        assert.equal(data.table, 1);
        assert.equal(data.session, 1);
        assert.equal(data.lastHandId, initialHands.at(-1).id);
        undos++;
        if (applyUndo) room.hands.pop();
        if (loseUndo) {
          loseUndo = false;
          await route.abort("failed");
        } else await route.fulfill({ json: state() });
        return;
      }
      if (url.searchParams.get("r") === "meeting") {
        await route.fulfill({
          json: {
            ...state(),
            open: true,
            checkinsOpen: true,
            meetingId: "audit-meeting",
            date: "2026-10-17",
            semester: "fall-2026",
            players,
          },
        });
        return;
      }
      assert.equal(url.searchParams.get("r"), "rooms");
      if (holdNextRead) {
        holdNextRead = false;
        const snapshot = state();
        delayed = () => route.fulfill({ json: snapshot });
      } else await route.fulfill({ json: state() });
      return;
    }
    if (url.origin === base.origin) return route.continue();
    if (!["GET", "HEAD"].includes(request.method()))
      unmockedWrites.push(request.url());
    await route.abort("blockedbyclient");
  });
  await page.addInitScript((player) => {
    localStorage.setItem(
      "club-checked-in",
      JSON.stringify({ meetingId: "audit-meeting", player }),
    );
    sessionStorage.setItem("club-player-confirmed", "1");
  }, players[0]);
  await page.goto(new URL("/meeting/table/1/", base).href);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page
    .getByRole("button", { name: "Undo game 2", exact: true })
    .waitFor();
  return {
    page,
    undos: () => undos,
    holdRead: () => {
      holdNextRead = true;
    },
    delayed: () => delayed,
    loseReply: (apply = true) => {
      loseUndo = true;
      applyUndo = apply;
    },
  };
}

test("a read started before Undo cannot restore the removed game", async (t) => {
  const { page, holdRead, delayed, undos } = await fixture(t);
  holdRead();
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await eventually(() => assert.ok(delayed()));
  await page.getByRole("button", { name: "Undo game 2", exact: true }).click();
  await page
    .getByRole("button", { name: "Undo game 1", exact: true })
    .waitFor();
  await delayed()();
  await page.waitForTimeout(250);
  assert.equal(
    await page
      .getByRole("button", { name: "Undo game 1", exact: true })
      .count(),
    1,
  );
  assert.equal(await page.locator(".game-rows > li").count(), 1);
  assert.equal(undos(), 1);
});

test("a lost Undo reply confirms the removal instead of suggesting another Undo", async (t) => {
  const { page, loseReply, undos } = await fixture(t);
  loseReply();
  await page.getByRole("button", { name: "Undo game 2", exact: true }).click();
  await page
    .getByRole("button", { name: "Undo game 1", exact: true })
    .waitFor();
  await page.getByText("Game 2 was undone.", { exact: true }).waitFor();
  assert.equal(await page.getByText(/Nothing was saved; try again/).count(), 0);
  assert.equal(undos(), 1);
});

test("a lost request that never applied is not reported as a successful Undo", async (t) => {
  const { page, loseReply, undos } = await fixture(t);
  loseReply(false);
  await page.getByRole("button", { name: "Undo game 2", exact: true }).click();
  await page.getByRole("alert").first().waitFor();
  assert.equal(
    await page.getByText("Game 2 was undone.", { exact: true }).count(),
    0,
  );
  assert.equal(await page.locator(".game-rows > li").count(), 2);
  assert.equal(undos(), 1);
});

async function eventually(assertion) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      assertion();
      return;
    } catch {
      /* Wait for the intercepted read. */
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assertion();
}
