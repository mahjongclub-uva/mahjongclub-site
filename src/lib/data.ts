/**
 * Reads data/*.json at build time and validates it against schema.ts.
 *
 * Everything here runs during `next build` and never in a browser, because the
 * site is a static export. If anything in this file throws, the build stops and
 * nothing deploys.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  metaSchema,
  semesterSchema,
  meetingsSchema,
  type Meta,
  type Semester,
  type Meeting,
} from "./schema";

const DATA_DIR = join(process.cwd(), "data");
const SEMESTER_DIR = join(DATA_DIR, "semesters");

/**
 * Turns a Zod failure into something you can act on without reading a stack
 * trace: which file, which field, what was wrong.
 */
function parseOrDie<T>(schema: z.ZodType<T>, raw: unknown, file: string): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      return `  ${path}: ${issue.message}`;
    })
    .join("\n");

  throw new Error(
    `${file} does not match the output contract:\n${problems}\n\n` +
      `The pipeline wrote data the site cannot render. Fix the pipeline, or ` +
      `update src/lib/schema.ts and OUTPUT-CONTRACT.md together if the ` +
      `contract itself is changing.`,
  );
}

function readJson(path: string, file: string): unknown {
  if (!existsSync(path)) {
    throw new Error(`${file} is missing. Run the pipeline: python3 pipeline/build_data.py`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    throw new Error(`${file} is not valid JSON`, { cause });
  }
}

export function getMeta(): Meta {
  return parseOrDie(metaSchema, readJson(join(DATA_DIR, "meta.json"), "data/meta.json"), "data/meta.json");
}

export function getSemester(id: string): Semester {
  const file = `data/semesters/${id}.json`;
  return parseOrDie(semesterSchema, readJson(join(SEMESTER_DIR, `${id}.json`), file), file);
}

/**
 * Loads everything and checks the rules that span more than one file, which a
 * per-file schema cannot see.
 *
 * Call this once at build time. It is the only function that can catch
 * meta.json and a semester file disagreeing with each other.
 */
export function getAllData(): { meta: Meta; semesters: Map<string, Semester> } {
  const meta = getMeta();
  const semesters = new Map<string, Semester>();

  for (const summary of meta.semesters) {
    const semester = getSemester(summary.id);

    // Contract rule 7, and the three fields meta.json duplicates from the
    // semester file. Duplicated data drifts; this is what catches it.
    if (semester.id !== summary.id) {
      throw new Error(
        `data/semesters/${summary.id}.json declares id "${semester.id}"`,
      );
    }
    if (semester.label !== summary.label) {
      throw new Error(
        `label mismatch for ${summary.id}: meta.json says "${summary.label}", the semester file says "${semester.label}"`,
      );
    }
    if (semester.sessions !== summary.sessions) {
      throw new Error(
        `sessions mismatch for ${summary.id}: meta.json says ${summary.sessions}, the semester file says ${semester.sessions}`,
      );
    }
    if (semester.last_session !== summary.last_session) {
      throw new Error(
        `last_session mismatch for ${summary.id}: meta.json says ${JSON.stringify(summary.last_session)}, the semester file says ${JSON.stringify(semester.last_session)}`,
      );
    }

    semesters.set(summary.id, semester);
  }

  // The other direction: a semester file that exists but is not in the nav
  // would be invisible on the site and is almost certainly a mistake.
  const listed = new Set(meta.semesters.map((s) => s.id));
  const onDisk = existsSync(SEMESTER_DIR)
    ? readdirSync(SEMESTER_DIR).filter((f) => f.endsWith(".json"))
    : [];
  for (const file of onDisk) {
    const id = file.replace(/\.json$/, "");
    if (!listed.has(id)) {
      throw new Error(
        `data/semesters/${file} exists but is not listed in meta.json, so nothing would link to it`,
      );
    }
  }

  return { meta, semesters };
}

/** The semester the site opens on. Explicit config, never today's date. */
export function getCurrentSemester(): Semester {
  const { meta, semesters } = getAllData();
  return semesters.get(meta.current_semester)!;
}

/**
 * The next meeting, or null if there is not one to name.
 *
 * Null covers three cases that all deserve silence rather than a placeholder:
 * the file has never been generated, the calendar has run out of events (the
 * usual reason is a recurring event that expired at the end of a semester),
 * and every meeting in the file has already happened because the weekly
 * refresh has not run.
 *
 * That last case is why the file holds several meetings and this picks the
 * first one still ahead. "Now" is the moment of the build, since a static
 * export has no other moment available.
 */
export function getNextMeeting(): Meeting | null {
  const path = join(DATA_DIR, "meetings.json");
  if (!existsSync(path)) return null;

  const data = parseOrDie(
    meetingsSchema,
    readJson(path, "data/meetings.json"),
    "data/meetings.json",
  );

  const now = Date.now();
  return (
    data.meetings.find((m) => new Date(m.end ?? m.start).getTime() > now) ?? null
  );
}
