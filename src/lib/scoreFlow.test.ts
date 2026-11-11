import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreView, type ScoreFlow } from "./scoreFlow.ts";
import type { Submission } from "./meeting.ts";

const submission = {
  r: "results",
  meetingId: "m1",
  submissionId: "s1",
  seats: [],
} as unknown as Submission;

test("only editing unlocks the form", () => {
  const flows: ScoreFlow[] = [
    { name: "restoring" },
    { name: "broken" },
    { name: "sending", submission },
    { name: "unconfirmed", submission },
    { name: "saved", table: 3, savedAt: "7:02 pm" },
  ];
  for (const flow of flows)
    assert.equal(scoreView(flow).locked, true, flow.name);
  assert.equal(scoreView({ name: "editing", phase: "score" }).locked, false);
});

test("a save owed shows the review step and keeps its submission", () => {
  for (const name of ["sending", "unconfirmed"] as const) {
    const view = scoreView({ name, submission });
    assert.equal(view.stage, "review");
    assert.equal(view.pending, submission);
    assert.equal(view.busy, name === "sending");
  }
});

test("editing shows its own step; restoring and broken show players", () => {
  assert.equal(scoreView({ name: "editing", phase: "score" }).stage, "score");
  assert.equal(scoreView({ name: "restoring" }).stage, "pick");
  assert.equal(scoreView({ name: "restoring" }).ready, false);
  assert.equal(scoreView({ name: "broken" }).stage, "pick");
  assert.equal(scoreView({ name: "broken" }).restoreFailed, true);
});

test("saved carries the receipt and nothing pending", () => {
  const view = scoreView({ name: "saved", table: 3, savedAt: "7:02 pm" });
  assert.deepEqual(
    { table: view.receipt?.table, savedAt: view.receipt?.savedAt },
    { table: 3, savedAt: "7:02 pm" },
  );
  assert.equal(view.pending, null);
});
