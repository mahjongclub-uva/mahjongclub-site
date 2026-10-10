import { test } from "node:test";
import assert from "node:assert/strict";
import { liveStandings, tonightStandings } from "./live.ts";
import type { Semester } from "./schema.ts";
import type { Results } from "./meeting.ts";

test("live scores use season nets, dense ties, qualification and official rank movement without double counting", () => {
  const semester: Semester = {
    schema_version: 1,
    id: "fall-2026",
    label: "Fall 2026",
    sessions: 1,
    last_session: "2026-09-25",
    min_tables_to_rank: 1,
    scoring_rule: "season-net",
    awards: [],
    unranked: [],
    standings: [
      {
        id: "p001",
        display: "A.",
        rank: 1,
        tables_played: 1,
        total_net: 10,
        avg_net: 10,
        total_gain: 10,
        avg_gain: 10,
        best_table: 10,
      },
      {
        id: "p002",
        display: "B.",
        rank: 2,
        tables_played: 1,
        total_net: 0,
        avg_net: 0,
        total_gain: 0,
        avg_gain: 0,
        best_table: 0,
      },
    ],
  };
  const results: Results = {
    status: 200,
    meetingId: "fall-2026:2026-10-02",
    date: "2026-10-02",
    tables: [
      {
        table: 1,
        seats: [
          { id: "p001", display: "A.", total: 195, net: -10 },
          { id: "p002", display: "B.", total: 205, net: 0 },
          { id: "p003", display: "C.", total: 220, net: 15 },
          {
            id: "p004",
            display: "Player p004",
            optOut: true,
            total: 200,
            net: -5,
          },
        ],
      },
    ],
  };
  const rows = liveStandings(semester, results);
  assert.deepEqual(
    rows.map((p) => [p.id, p.points, p.rank, p.before]),
    [
      ["p003", 220, 1, null],
      ["p001", 205, 2, 1],
      ["p002", 205, 2, 2],
    ],
  );
  assert.deepEqual(
    liveStandings({ ...semester, last_session: results.date }, results).map(
      (p) => p.points,
    ),
    [215, 205],
  );
  assert.equal(
    liveStandings({ ...semester, min_tables_to_rank: 2 }, results).some(
      (p) => p.id === "p003",
    ),
    false,
  );
  assert.equal(
    liveStandings(
      {
        ...semester,
        unranked: [
          { id: "p003", display: "C.", tables_played: 1, tables_needed: 1 },
        ],
      },
      results,
    ).some((p) => p.id === "p003"),
    false,
  );
});

test("tonight sums saved nets per player, skips opt-outs, and ranks densely", () => {
  const seat = (id: string, net: number, optOut = false) => ({
    id,
    display: id.toUpperCase(),
    optOut,
    total: 205 + net,
    net,
  });
  const results: Results = {
    status: 200,
    meetingId: "m",
    date: "2026-10-09",
    tables: [
      {
        table: 1,
        seats: [
          seat("p001", 30),
          seat("p002", -10),
          seat("p003", -10),
          seat("p004", -10, true),
        ],
      },
      {
        table: 2,
        seats: [
          seat("p001", -20),
          seat("p002", 40),
          seat("p005", -10),
          seat("p006", -10),
        ],
      },
    ],
  };
  const rows = tonightStandings(results.tables);
  assert.deepEqual(
    rows.map((row) => [row.id, row.rank, row.net, row.tables]),
    [
      ["p002", 1, 30, 2],
      ["p001", 2, 10, 2],
      ["p003", 3, -10, 1],
      ["p005", 3, -10, 1],
      ["p006", 3, -10, 1],
    ],
  );
  assert.equal(tonightStandings([]).length, 0);
});
