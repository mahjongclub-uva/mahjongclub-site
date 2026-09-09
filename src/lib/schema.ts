/**
 * The seam between the two halves of this project.
 *
 * The Python pipeline writes data/*.json. This file is the executable version
 * of OUTPUT-CONTRACT.md: every rule the contract states is a check here, and a
 * violation fails `npm run build` with the offending field named.
 *
 * The point is that a bad build never deploys. GitHub Pages keeps serving the
 * last good version, which is stale but correct — always the better failure.
 *
 * If you change a rule here, change OUTPUT-CONTRACT.md in the same commit.
 */

import { z } from "zod";

/**
 * How many tables a player must have played to appear in the ranked standings.
 *
 * Pinned here as well as in the data so the pipeline cannot quietly change who
 * qualifies without someone editing the site too. To change the threshold,
 * change this constant AND the pipeline's config in the same commit.
 */
export const MIN_TABLES_TO_RANK = 2;

/**
 * The awards the site knows how to render. The pipeline may emit any subset,
 * in any order, including none at all — but not an award that is not listed
 * here, because there would be no template for it.
 *
 * To add an award: add its id here, emit it from the pipeline, render it.
 */
export const AWARD_IDS = ["biggest-win"] as const;

/** e.g. "fall-2025". Never derived from anything private. */
const semesterId = z
  .string()
  .regex(/^(spring|summer|fall)-\d{4}$/, "must look like fall-2025");

/**
 * Opaque player identifier, e.g. "p014". Assigned once in the roster and never
 * derived from a name — the p### shape makes that mechanically true rather
 * than merely intended, and it is what keeps player ids out of URLs meaningful.
 */
const playerId = z.string().regex(/^p\d{3,}$/, "must look like p014");

/**
 * A public display name: "Eddie Z." by default, or a handle chosen via the
 * roster overrides.
 *
 * A schema cannot tell a display name from a legal name, so contract rule 4
 * ("never contains a full legal name") is enforced by the pipeline and the
 * roster, not here. All this can do is reject the obviously wrong.
 */
const displayName = z.string().min(1).max(40).trim();

/** A number rounded to at most one decimal place. */
const oneDecimal = z
  .number()
  .refine((n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-9, {
    message: "must be rounded to at most one decimal place",
  });

/**
 * True when `avg` is the correct one-decimal rounding of `total / count`.
 * Guards against the pipeline shipping an average that does not match the
 * numbers printed beside it.
 */
function isCorrectAverage(avg: number, total: number, count: number): boolean {
  return Math.abs(avg - total / count) <= 0.05 + 1e-9;
}

/** Orders semesters within the academic year: fall 2025 precedes spring 2026. */
function academicKey(id: string): number {
  const [term, year] = id.split("-");
  const order: Record<string, number> = { spring: 1, summer: 2, fall: 3 };
  return Number(year) * 10 + order[term];
}

const standingsEntry = z
  .object({
    id: playerId,
    rank: z.number().int().positive(),
    display: displayName,
    tables_played: z.number().int().positive(),
    // gain floors each table at zero, so a total can never be negative.
    total_gain: z.number().nonnegative(),
    avg_gain: oneDecimal.nonnegative(),
    // The best single table is a raw net, so it can be negative for a player
    // who never won one.
    best_table: z.number(),
    total_net: z.number(),
    avg_net: oneDecimal,
  })
  // Reject unknown keys. A field the pipeline invents is a contract change,
  // and it should be noticed here rather than silently ignored.
  .strict()
  .superRefine((p, ctx) => {
    if (p.tables_played < MIN_TABLES_TO_RANK) {
      ctx.addIssue({
        code: "custom",
        path: ["tables_played"],
        message: `ranked with ${p.tables_played} tables, below the threshold of ${MIN_TABLES_TO_RANK}`,
      });
    }
    if (!isCorrectAverage(p.avg_gain, p.total_gain, p.tables_played)) {
      ctx.addIssue({
        code: "custom",
        path: ["avg_gain"],
        message: `${p.avg_gain} is not ${p.total_gain} / ${p.tables_played}`,
      });
    }
    if (!isCorrectAverage(p.avg_net, p.total_net, p.tables_played)) {
      ctx.addIssue({
        code: "custom",
        path: ["avg_net"],
        message: `${p.avg_net} is not ${p.total_net} / ${p.tables_played}`,
      });
    }
    // gain is the sum of max(net, 0) over the same tables that produced net,
    // so it is always at least net.
    if (p.total_gain < p.total_net) {
      ctx.addIssue({
        code: "custom",
        path: ["total_gain"],
        message: `total_gain ${p.total_gain} is below total_net ${p.total_net}`,
      });
    }
    // A player whose best table was a loss has won nothing, so their gain is
    // exactly zero. A player who won at least once has gain of at least that
    // table.
    if (p.best_table > 0 && p.total_gain < p.best_table) {
      ctx.addIssue({
        code: "custom",
        path: ["total_gain"],
        message: `total_gain ${p.total_gain} is below best_table ${p.best_table}`,
      });
    }
    if (p.best_table <= 0 && p.total_gain !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["total_gain"],
        message: `best_table ${p.best_table} was not a win, so total_gain must be 0`,
      });
    }
  });

const unrankedEntry = z
  .object({
    id: playerId,
    display: displayName,
    tables_played: z.number().int().positive(),
    tables_needed: z.number().int().positive(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.tables_played >= MIN_TABLES_TO_RANK) {
      ctx.addIssue({
        code: "custom",
        path: ["tables_played"],
        message: `unranked with ${p.tables_played} tables, at or above the threshold of ${MIN_TABLES_TO_RANK}`,
      });
    }
    if (p.tables_needed !== MIN_TABLES_TO_RANK - p.tables_played) {
      ctx.addIssue({
        code: "custom",
        path: ["tables_needed"],
        message: `should be ${MIN_TABLES_TO_RANK - p.tables_played}, got ${p.tables_needed}`,
      });
    }
  });

const award = z
  .object({
    id: z.enum(AWARD_IDS),
    label: z.string().min(1),
    display: displayName,
    value: z.number(),
    unit: z.string().min(1),
    detail: z.string().min(1).nullable(),
  })
  .strict();

export const semesterSchema = z
  .object({
    schema_version: z.literal(1),
    id: semesterId,
    label: z.string().min(1),
    sessions: z.number().int().nonnegative(),
    last_session: z.iso.date().nullable(),
    min_tables_to_rank: z.literal(MIN_TABLES_TO_RANK),
    standings: z.array(standingsEntry),
    unranked: z.array(unrankedEntry),
    awards: z.array(award),
  })
  .strict()
  .superRefine((s, ctx) => {
    // Contract rule 6, reconciled with rule 8: a semester that has not been
    // played yet has no last session. Any other combination is a pipeline bug.
    if ((s.sessions === 0) !== (s.last_session === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["last_session"],
        message: `sessions is ${s.sessions} but last_session is ${JSON.stringify(s.last_session)}`,
      });
    }

    // Contract rule 5: ids are unique within a semester, across both lists.
    const seen = new Set<string>();
    for (const p of [...s.standings, ...s.unranked]) {
      if (seen.has(p.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["standings"],
          message: `duplicate player id ${p.id}`,
        });
      }
      seen.add(p.id);
    }

    // Contract rule 1, as amended: rank by total_gain desc, then fewer tables
    // played, then total_net desc. Ranks start at 1 and never gap. Two players
    // share a rank only when all three keys are equal, which makes them
    // genuinely indistinguishable.
    s.standings.forEach((cur, i) => {
      if (i === 0) {
        if (cur.rank !== 1) {
          ctx.addIssue({
            code: "custom",
            path: ["standings", 0, "rank"],
            message: `standings must start at rank 1, got ${cur.rank}`,
          });
        }
        return;
      }
      const prev = s.standings[i - 1];
      const where = ["standings", i] as const;

      let ordered: boolean;
      let tied = false;
      if (prev.total_gain !== cur.total_gain) {
        ordered = prev.total_gain > cur.total_gain;
      } else if (prev.tables_played !== cur.tables_played) {
        ordered = prev.tables_played < cur.tables_played;
      } else if (prev.total_net !== cur.total_net) {
        ordered = prev.total_net > cur.total_net;
      } else {
        ordered = true;
        tied = true;
      }

      if (!ordered) {
        ctx.addIssue({
          code: "custom",
          path: [...where],
          message:
            `${cur.display} is ranked below ${prev.display} but sorts above it ` +
            `(gain ${cur.total_gain} vs ${prev.total_gain}, ` +
            `tables ${cur.tables_played} vs ${prev.tables_played}, ` +
            `net ${cur.total_net} vs ${prev.total_net})`,
        });
      }

      const expected = tied ? prev.rank : prev.rank + 1;
      if (cur.rank !== expected) {
        ctx.addIssue({
          code: "custom",
          path: [...where, "rank"],
          message: `expected rank ${expected} after ${prev.display} at ${prev.rank}, got ${cur.rank}`,
        });
      }
    });

    // Contract: unranked sorts by tables played desc, then display name.
    s.unranked.forEach((cur, i) => {
      if (i === 0) return;
      const prev = s.unranked[i - 1];
      const ordered =
        prev.tables_played > cur.tables_played ||
        (prev.tables_played === cur.tables_played &&
          prev.display <= cur.display);
      if (!ordered) {
        ctx.addIssue({
          code: "custom",
          path: ["unranked", i],
          message: `${cur.display} sorts above ${prev.display}`,
        });
      }
    });

    // An award is emitted at most once.
    const awardIds = new Set<string>();
    for (const a of s.awards) {
      if (awardIds.has(a.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["awards"],
          message: `duplicate award ${a.id}`,
        });
      }
      awardIds.add(a.id);
    }
  });

const semesterSummary = z
  .object({
    id: semesterId,
    label: z.string().min(1),
    sessions: z.number().int().nonnegative(),
    last_session: z.iso.date().nullable(),
  })
  .strict();

export const metaSchema = z
  .object({
    schema_version: z.literal(1),
    generated_at: z.iso.datetime(),
    pipeline_version: z.string().regex(/^\d+\.\d+\.\d+$/, "must be x.y.z"),
    current_semester: semesterId,
    semesters: z.array(semesterSummary).min(1),
  })
  .strict()
  .superRefine((m, ctx) => {
    const ids = m.semesters.map((s) => s.id);

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["semesters"],
        message: "duplicate semester id",
      });
    }

    // current_semester is explicit config, never derived from today's date —
    // date math would land a summer visitor on an empty page.
    if (!ids.includes(m.current_semester)) {
      ctx.addIssue({
        code: "custom",
        path: ["current_semester"],
        message: `${m.current_semester} is not in semesters`,
      });
    }

    // Newest first. The site renders the nav in array order and never sorts.
    for (let i = 1; i < m.semesters.length; i++) {
      if (academicKey(ids[i - 1]) <= academicKey(ids[i])) {
        ctx.addIssue({
          code: "custom",
          path: ["semesters", i],
          message: `${ids[i]} should sort before ${ids[i - 1]}; semesters run newest first`,
        });
      }
    }
  });

/**
 * data/meetings.json — the next few meetings, read from the club's public
 * calendar by pipeline/build_meetings.py.
 *
 * Separate from the semester files on purpose: those are a record of what
 * happened and change when the secretary scores a table, this is a forecast
 * and goes stale on its own. An empty list is normal and means the site hides
 * the next-meeting line, which is the right thing to do between semesters.
 */
export const meetingsSchema = z
  .object({
    generated_at: z.iso.datetime(),
    meetings: z
      .array(
        z
          .object({
            // Offset-carrying, not a bare date: the club meets at a time of
            // day, and 17:30 in November is a different UTC instant than
            // 17:30 in September.
            start: z.iso.datetime({ offset: true }),
            end: z.iso.datetime({ offset: true }).nullable(),
            summary: z.string().min(1),
            // Whatever the calendar event's Location field says, or null when
            // it is blank. Published as written, so what goes in that field on
            // the calendar is a privacy decision every time.
            location: z.string().min(1).nullable(),
          })
          .strict(),
      )
      .superRefine((list, ctx) => {
        // Soonest first. The site shows list[0] and never sorts.
        for (let i = 1; i < list.length; i++) {
          if (list[i - 1].start >= list[i].start) {
            ctx.addIssue({
              code: "custom",
              path: [i, "start"],
              message: "meetings run soonest first",
            });
          }
        }
      }),
  })
  .strict();

export type Meta = z.infer<typeof metaSchema>;
export type Semester = z.infer<typeof semesterSchema>;
export type Standing = Semester["standings"][number];
export type Unranked = Semester["unranked"][number];
export type Award = Semester["awards"][number];
export type Meetings = z.infer<typeof meetingsSchema>;
export type Meeting = Meetings["meetings"][number];
