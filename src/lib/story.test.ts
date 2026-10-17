import { test } from "node:test";
import assert from "node:assert/strict";
import { storyBoard } from "./story.ts";
import type { Semester } from "./schema.ts";

const player = (
  n: number,
  rank: number,
  total_net: number,
  rank_change?: number | null,
) => ({
  id: `p${String(n).padStart(3, "0")}`,
  rank,
  display: `Player ${n}.`,
  tables_played: 1,
  total_gain: Math.max(total_net, 0),
  avg_gain: Math.max(total_net, 0),
  best_table: total_net,
  total_net,
  avg_net: total_net,
  ...(rank_change === undefined ? {} : { rank_change }),
});

const semester = (standings: Semester["standings"]): Semester => ({
  schema_version: 1,
  id: "fall-2026",
  label: "Fall 2026",
  sessions: 2,
  last_session: "2026-10-16",
  min_tables_to_rank: 1,
  scoring_rule: "season-net",
  standings,
  unranked: [],
  awards: [],
});

test("story shows the top nine, movement chips and the biggest climb anywhere on the board", () => {
  const changes = [2, 0, -2, null, 1, 0, 0, 0, 0, 11];
  const board = storyBoard(
    semester(changes.map((c, i) => player(i + 1, i + 1, 100 - i * 10, c))),
  );
  assert.equal(board.date, "Fri Oct 16");
  assert.deepEqual(
    board.podium.map((e) => [e.rank, e.score]),
    [
      [1, 305],
      [2, 295],
      [3, 285],
    ],
  );
  assert.equal(board.rows.length, 6);
  assert.deepEqual(
    board.podium.map((e) => e.move?.text),
    ["2", "HELD", "2"],
  );
  assert.deepEqual(
    board.podium.map((e) => e.move?.dir),
    ["up", "held", "down"],
  );
  assert.equal(board.rows[0].move?.text, "NEW");
  // Tenth place is off the story but still the night's biggest climber.
  assert.deepEqual(board.climb, { name: "Player 10.", places: 11 });
});

test("story before places moved exist has no chips and no climb, and copes with a short board", () => {
  const board = storyBoard(semester([player(1, 1, 50), player(2, 1, 50)]));
  assert.equal(board.hasMoves, false);
  assert.equal(board.climb, null);
  assert.deepEqual(
    board.podium.map((e) => e.rank),
    [1, 1],
  );
  assert.equal(board.rows.length, 0);
});
