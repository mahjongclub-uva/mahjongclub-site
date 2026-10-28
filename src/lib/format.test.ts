import { test } from "node:test";
import assert from "node:assert/strict";
import { clubDate, tileNames } from "./format.ts";

test("tile names drop the initial unless a first name clashes, and leave handles alone", () => {
  const names = tileNames([
    { id: "p1", display: "Chris M." },
    { id: "p2", display: "chris T." },
    { id: "p3", display: "Dana T." },
    { id: "p4", display: "tilequeen" },
    { id: "p5", display: "Mary Ann K." },
  ]);
  assert.deepEqual(Object.fromEntries(names), {
    p1: "Chris M.",
    p2: "chris T.",
    p3: "Dana",
    p4: "tilequeen",
    p5: "Mary Ann K.",
  });
});

test("the club's date turns over at midnight in Charlottesville, not UTC", () => {
  assert.equal(clubDate(new Date("2026-10-31T03:59:00Z")), "2026-10-30");
  assert.equal(clubDate(new Date("2026-10-31T04:00:00Z")), "2026-10-31");
});
