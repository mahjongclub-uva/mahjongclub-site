import { test } from "node:test";
import assert from "node:assert/strict";
import { COLLAB_NIGHTS, collabOn, halloweenWeek, seasonOn } from "./season.ts";

test("the pages wear Halloween that week and a partner's theme on its night only", () => {
  const on = (y: number, m: number, d: number, h = 18) =>
    seasonOn(new Date(y, m, d, h), COLLAB_NIGHTS);
  assert.equal(on(2026, 9, 30), "halloween");
  assert.equal(on(2026, 10, 6), "hksa");
  assert.equal(on(2026, 10, 6, 23), "hksa");
  assert.equal(on(2026, 10, 7), null);
  assert.equal(on(2026, 10, 15), "csa");
  assert.equal(on(2026, 10, 16), null);
  assert.equal(on(2026, 10, 13), null);
  assert.ok(halloweenWeek(new Date(2026, 9, 24)));
  assert.ok(!halloweenWeek(new Date(2026, 10, 6)));
});

test("the head script runs the season check as a string, so it needs nothing from outside", () => {
  const run = new Function(
    `return (${seasonOn})(new Date(2026, 10, 6, 20), ${JSON.stringify(COLLAB_NIGHTS)})`,
  );
  assert.equal(run(), "hksa");
});

test("a meeting's date names its partner", () => {
  assert.equal(collabOn("2026-11-06"), "hksa");
  assert.equal(collabOn("2026-11-07"), undefined);
  assert.equal(collabOn("2026-11-15"), "csa");
  assert.equal(collabOn(null), undefined);
});
