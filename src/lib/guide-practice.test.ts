import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wallSeat,
  isWin,
  legalCalls,
  makeCallRound,
  makeCallRounds,
  callNudge,
  seeded,
  LEFT,
  type Piece,
  makeTurnScript,
} from "./guide-practice.ts";

test("two-dice totals select seats counterclockwise, starting at the dealer", () => {
  const expected = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
  for (let total = 2; total <= 12; total++)
    assert.equal(wallSeat(total), expected[total - 2]);
  // Across deals: a 2 lands on the left player, a 5 back on across.
  assert.equal(wallSeat(2, 2), 3);
  assert.equal(wallSeat(5, 2), 2);
});

const t = (suit: Piece["suit"], ...ranks: number[]): Piece[] =>
  ranks.map((rank) => ({ suit, rank }));

test("a win is five sets and a pair", () => {
  const hand = [
    ...t("characters", 1, 2, 3, 7, 7, 7),
    ...t("dots", 4, 5, 6, 9, 9),
    ...t("bamboo", 2, 2, 2, 6, 7, 8),
  ];
  assert.ok(isWin(hand));
  assert.ok(!isWin([...hand.slice(0, 16), { suit: "dots", rank: 8 }]));
});

test("chows only from the left; pungs and kongs from anyone", () => {
  const hand = [...t("characters", 5, 6), ...t("dots", 8, 8, 8)];
  const seven = { suit: "characters", rank: 7 } as const;
  const eight = { suit: "dots", rank: 8 } as const;
  assert.deepEqual(legalCalls(hand, seven, LEFT), ["Chow", "Pass"]);
  assert.deepEqual(legalCalls(hand, seven, 1), ["Pass"]);
  assert.deepEqual(legalCalls(hand, eight, 2), ["Pung", "Kong", "Pass"]);
});

test("every random round allows exactly the call it teaches", () => {
  for (const kind of ["Pung", "Chow", "Pass", "Kong", "Win"] as const) {
    for (let n = 0; n < 500; n++) {
      const r = makeCallRound(kind);
      assert.equal(r.answer, kind);
      assert.equal(r.hand.length, 16);
      const legal = legalCalls(r.hand, r.discard, r.from);
      assert.ok(legal.includes(kind));
      assert.ok(!legal.includes("Win") || kind === "Win");
      if (kind === "Chow") assert.equal(r.from, LEFT);
      if (kind === "Pass") assert.deepEqual(legal, ["Pass"]);
      if (r.rival) assert.notEqual(r.rival, r.from);
      for (const i of [...r.uses, ...r.loose]) assert.ok(r.hand[i]);
      assert.ok(!r.loose.some((i) => r.uses.includes(i)));
      // Winds and dragons are bonus tiles at the club: never in a hand.
      for (const x of [...r.hand, r.discard])
        assert.ok(["characters", "dots", "bamboo"].includes(x.suit));
      if (["Pung", "Chow", "Kong"].includes(kind)) assert.ok(r.loose.length);
      const all = [...r.hand, r.discard];
      for (const x of all)
        assert.ok(
          all.filter((y) => y.suit === x.suit && y.rank === x.rank).length <= 4,
        );
    }
  }
});

test("five rounds, one of each, and a seed always deals the same", () => {
  const a = makeCallRounds(seeded(1));
  assert.deepEqual(a.map((r) => r.answer).sort(), [
    "Chow",
    "Kong",
    "Pass",
    "Pung",
    "Win",
  ]);
  assert.deepEqual(makeCallRounds(seeded(1)), a);
});

test("a wrong pick gets a nudge, never the answer", () => {
  for (let n = 0; n < 200; n++)
    for (const r of makeCallRounds())
      for (const call of ["Win", "Pung", "Kong", "Chow", "Pass"] as const)
        if (call !== r.answer) assert.ok(!callNudge(r, call).includes(r.why));
});

test("a turn script throws the lone tiles and wins on the third draw", () => {
  for (let n = 0; n < 300; n++) {
    const { kept, partial, odd, bonus, win } = makeTurnScript();
    assert.equal(kept.length, 14);
    assert.ok(isWin([...kept, ...partial, win]));
    for (const o of odd) {
      assert.ok(!isWin([...kept, ...partial, o]));
      assert.ok(
        ![...kept, ...partial].some(
          (x) => x.suit === o.suit && Math.abs(x.rank - o.rank) <= 2,
        ),
      );
    }
    assert.ok(bonus.length >= 1 && bonus.length <= 2);
    for (const b of bonus)
      assert.ok(["flower", "season", "wind", "dragon"].includes(b.suit));
  }
});
