/**
 * Checks that the contract in schema.ts actually rejects bad data.
 *
 *     npm test
 *
 * Every test takes data that is known-good, breaks exactly one thing, and
 * asserts the schema notices. A rule nobody has tested is a rule that might
 * not work, and this schema is the only thing standing between a pipeline bug
 * and a wrong leaderboard in public.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { metaSchema, semesterSchema } from "./schema.ts";

/** Known-good Fall 2025 data, trimmed to three players. */
function validSemester() {
  return {
    schema_version: 1,
    id: "fall-2025",
    label: "Fall 2025",
    sessions: 8,
    last_session: "2025-11-14",
    min_tables_to_rank: 2,
    standings: [
      {
        id: "p001",
        rank: 1,
        display: "Eddie Z.",
        tables_played: 7,
        total_gain: 648,
        avg_gain: 92.6,
        best_table: 288,
        total_net: 542,
        avg_net: 77.4,
      },
      {
        id: "p002",
        rank: 2,
        display: "Kevin J.",
        tables_played: 12,
        total_gain: 647,
        avg_gain: 53.9,
        best_table: 209,
        total_net: 392,
        avg_net: 32.7,
      },
      {
        id: "p003",
        rank: 3,
        display: "Bailee N.",
        tables_played: 2,
        total_gain: 0,
        avg_gain: 0,
        best_table: -15,
        total_net: -55,
        avg_net: -27.5,
      },
    ],
    unranked: [
      { id: "p004", display: "Howard F.", tables_played: 1, tables_needed: 1 },
    ],
    awards: [
      {
        id: "biggest-win",
        label: "Biggest single table",
        display: "Eddie Z.",
        value: 288,
        unit: "points",
        detail: "2025-10-05",
      },
    ],
  };
}

function validMeta() {
  return {
    schema_version: 1,
    generated_at: "2026-09-07T04:12:00Z",
    pipeline_version: "0.1.0",
    current_semester: "fall-2025",
    semesters: [
      {
        id: "fall-2025",
        label: "Fall 2025",
        sessions: 8,
        last_session: "2025-11-14",
      },
    ],
  };
}

/** Applies one breaking change and asserts the schema rejects the result. */
function rejects(
  name: string,
  build: () => unknown,
  schema: typeof semesterSchema | typeof metaSchema = semesterSchema,
) {
  test(`rejects ${name}`, () => {
    const result = schema.safeParse(build());
    assert.equal(
      result.success,
      false,
      `expected a failure for: ${name}, but the schema accepted it`,
    );
  });
}

test("accepts known-good data", () => {
  const semester = semesterSchema.safeParse(validSemester());
  assert.equal(
    semester.success,
    true,
    semester.success ? "" : JSON.stringify(semester.error.issues, null, 2),
  );

  const meta = metaSchema.safeParse(validMeta());
  assert.equal(
    meta.success,
    true,
    meta.success ? "" : JSON.stringify(meta.error.issues, null, 2),
  );
});

// --- ranking ---------------------------------------------------------------

rejects("standings that do not start at rank 1", () => {
  const s = validSemester();
  s.standings.forEach((p) => (p.rank += 1));
  return s;
});

rejects("a gap in the ranks", () => {
  const s = validSemester();
  s.standings[2].rank = 4;
  return s;
});

rejects("a player with less gain ranked above one with more", () => {
  const s = validSemester();
  [s.standings[0], s.standings[1]] = [s.standings[1], s.standings[0]];
  s.standings[0].rank = 1;
  s.standings[1].rank = 2;
  return s;
});

rejects("the tiebreak running the wrong way on equal gain", () => {
  // Equal gain, so the player with FEWER tables must rank higher.
  const s = validSemester();
  s.standings[1].total_gain = 648;
  s.standings[1].avg_gain = 54;
  s.standings[0].tables_played = 12;
  s.standings[0].avg_gain = 54;
  s.standings[0].avg_net = 45.2;
  s.standings[1].tables_played = 7;
  s.standings[1].avg_net = 56;
  return s;
});

rejects("a shared rank between players who are not fully tied", () => {
  const s = validSemester();
  s.standings[1].rank = 1;
  s.standings[2].rank = 2;
  return s;
});

test("accepts a shared rank when gain, tables and net are all equal", () => {
  const s = validSemester();
  const tied = { ...s.standings[2], id: "p005", display: "Jun I.", rank: 3 };
  s.standings.push(tied);
  const result = semesterSchema.safeParse(s);
  assert.equal(
    result.success,
    true,
    result.success ? "" : JSON.stringify(result.error.issues, null, 2),
  );
});

// --- arithmetic ------------------------------------------------------------

rejects("an average that does not match its total", () => {
  const s = validSemester();
  s.standings[0].avg_gain = 80;
  return s;
});

rejects("an average carrying two decimal places", () => {
  const s = validSemester();
  s.standings[0].avg_gain = 92.57;
  return s;
});

rejects("total_gain below total_net", () => {
  const s = validSemester();
  s.standings[0].total_gain = 100;
  s.standings[0].avg_gain = 14.3;
  return s;
});

rejects("nonzero gain for a player whose best table was a loss", () => {
  const s = validSemester();
  s.standings[2].total_gain = 10;
  s.standings[2].avg_gain = 5;
  return s;
});

// --- structure -------------------------------------------------------------

rejects("a field the site does not know about", () => {
  const s = validSemester();
  (s.standings[0] as Record<string, unknown>).dues_paid = true;
  return s;
});

rejects("the same player id twice", () => {
  const s = validSemester();
  s.standings[1].id = "p001";
  return s;
});

rejects("a ranked player below the tables threshold", () => {
  const s = validSemester();
  s.standings[2].tables_played = 1;
  s.standings[2].avg_gain = 0;
  s.standings[2].avg_net = -55;
  return s;
});

rejects("unranked tables_needed that does not match", () => {
  const s = validSemester();
  s.unranked[0].tables_needed = 5;
  return s;
});

rejects("a numeric field sent as a string", () => {
  const s = validSemester();
  (s.standings[0] as Record<string, unknown>).total_gain = "648";
  return s;
});

rejects("an award the site has no template for", () => {
  const s = validSemester();
  (s.awards[0] as Record<string, unknown>).id = "most-improved";
  return s;
});

// --- sessions and dates ----------------------------------------------------

rejects("a semester with no sessions but a last session date", () => {
  const s = validSemester();
  s.sessions = 0;
  return s;
});

rejects("a semester with sessions but no last session date", () => {
  const s = validSemester();
  (s as Record<string, unknown>).last_session = null;
  return s;
});

rejects("a date that is not a real day", () => {
  const s = validSemester();
  s.last_session = "2025-02-30";
  return s;
});

test("accepts a semester that has not been played yet", () => {
  const s = validSemester();
  s.sessions = 0;
  (s as Record<string, unknown>).last_session = null;
  s.standings = [];
  s.unranked = [];
  s.awards = [];
  const result = semesterSchema.safeParse(s);
  assert.equal(
    result.success,
    true,
    result.success ? "" : JSON.stringify(result.error.issues, null, 2),
  );
});

// --- meta ------------------------------------------------------------------

rejects(
  "a current_semester that is not in the list",
  () => {
    const m = validMeta();
    m.current_semester = "spring-2026";
    return m;
  },
  metaSchema,
);

rejects(
  "semesters listed oldest first",
  () => {
    const m = validMeta();
    m.semesters.push({
      id: "spring-2026",
      label: "Spring 2026",
      sessions: 3,
      last_session: "2026-02-10",
    });
    return m;
  },
  metaSchema,
);
