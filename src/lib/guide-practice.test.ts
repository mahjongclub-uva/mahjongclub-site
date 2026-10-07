import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wallSeat,
  FIRST_CALL,
  makeCallScenario,
  callFeedback,
  makeTurnHand,
} from "./guide-practice.ts";

test("two-dice totals select seats counterclockwise, starting at the dealer", () => {
  const expected = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
  for (let total = 2; total <= 12; total++)
    assert.equal(wallSeat(total), expected[total - 2]);
});

test("random call rounds always follow the calling rules", () => {
  for (let n = 0; n < 500; n++) {
    const s = makeCallScenario();
    const set = [...s.ranks, s.discard].sort((a, b) => a - b);
    const isPung = set.every((rank) => rank === set[0]);
    const isRun = set[1] === set[0] + 1 && set[2] === set[1] + 1;
    assert.ok(set.every((rank) => rank >= 1 && rank <= 9));
    assert.notEqual(s.after.suit, s.suit);
    if (s.call === "Pung") assert.ok(isPung && s.from !== "You");
    if (s.call === "Chow") assert.ok(isRun && s.from === "Left player");
    if (s.call === "Pass") assert.ok(isRun && s.from !== "Left player");
  }
});

test("feedback confirms right calls and nudges wrong ones without the answer", () => {
  for (let n = 0; n < 100; n++) {
    const s = n ? makeCallScenario() : FIRST_CALL;
    assert.match(callFeedback(s, s.call), /That's right/);
    for (const call of ["Pung", "Chow"] as const) {
      if (call !== s.call) {
        assert.match(callFeedback(s, call), /Not quite/);
        assert.ok(!callFeedback(s, call).includes(s.reason));
      }
    }
    assert.doesNotMatch(callFeedback(s, "Pass"), /Not quite/);
  }
  assert.match(callFeedback(FIRST_CALL, "Pass"), /Passing is allowed/);
});

test("a turn hand is a run in one suit plus one tile from another", () => {
  for (let n = 0; n < 200; n++) {
    const [a, b, c, odd] = makeTurnHand();
    assert.ok(a.suit === b.suit && b.suit === c.suit && odd.suit !== a.suit);
    assert.deepEqual([b.rank - a.rank, c.rank - b.rank], [1, 1]);
    assert.ok(a.rank >= 1 && c.rank <= 9);
  }
});
