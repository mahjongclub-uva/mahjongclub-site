import { z } from "zod";

const playerSchema = z.object({
  id: z.string().regex(/^p\d{3,}$/),
  display: z.string().min(1),
});
const replySchema = z.object({
  status: z.number().int(),
  message: z.string().optional(),
  player: playerSchema.optional(),
  suggestions: z.array(playerSchema).optional(),
  table: z.number().int().positive().optional(),
});
const meetingSchema = z.object({
  status: z.literal(200),
  open: z.boolean(),
  checkinsOpen: z.boolean(),
  meetingId: z.string().nullable(),
  date: z.string().nullable(),
  semester: z.string().nullable(),
  players: z.array(playerSchema).optional(),
});
export type Player = z.infer<typeof playerSchema>;
export type Meeting = z.infer<typeof meetingSchema>;
export type Seat = { id: string; total: number };
export type Submission = {
  r: "results";
  meetingId: string;
  submissionId: string;
  seats: Seat[];
};
export const pendingSchema = z.object({
  r: z.literal("results"),
  meetingId: z.string(),
  submissionId: z.string().uuid(),
  seats: z
    .array(
      z.object({
        id: playerSchema.shape.id,
        total: z.number().int().min(0).max(820),
      }),
    )
    .length(4),
});
export const PENDING_STORAGE = "club-pending-table";

export function tableError(seats: Seat[], players: Player[]): string | null {
  if (
    seats.length !== 4 ||
    seats.some((seat) => !players.some((player) => player.id === seat.id))
  )
    return "Choose four checked-in players.";
  if (new Set(seats.map((seat) => seat.id)).size !== 4)
    return "Choose four different players.";
  if (
    seats.some(
      (seat) =>
        !Number.isSafeInteger(seat.total) || seat.total < 0 || seat.total > 820,
    )
  )
    return "Enter whole totals from 0 to 820 for all four players.";
  if (seats.reduce((sum, seat) => sum + seat.total, 0) !== 820)
    return "The four totals must add up to 820.";
  return null;
}

export const CARD_VALUES = [50, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export function cardTotal(counts: number[]): number {
  return counts.reduce(
    (total, count, index) => total + count * CARD_VALUES[index],
    0,
  );
}

async function readResponse(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: init.signal ?? AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new Error(
      "Could not reach the meeting. Please retry or ask an officer.",
    );
  const body: unknown = await response.json();
  const reply = replySchema.parse(body);
  return { body, reply };
}
export async function getMeeting(
  url: string,
  signal?: AbortSignal,
): Promise<Meeting> {
  const target = new URL(url);
  target.searchParams.set("r", "meeting");
  const { body, reply } = await readResponse(target.href, {
    signal,
    cache: "no-store",
  });
  if (reply.status !== 200)
    throw new Error(
      reply.message || "An officer needs to check the meeting settings.",
    );
  return meetingSchema.parse(body);
}
export async function postMeeting(url: string, data: object) {
  const { reply } = await readResponse(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(data),
  });
  return reply;
}
export function requestError(error: unknown): string {
  return error instanceof Error &&
    !(error instanceof z.ZodError) &&
    error.name !== "TimeoutError" &&
    error.name !== "TypeError"
    ? error.message
    : "Could not confirm the request. Please retry or ask an officer.";
}

export const RETURN_STORAGE = "club-meeting-return";
export const DRAFT_STORAGE = "club-table-draft";
export const draftSchema = z.object({
  meetingId: z.string(),
  ids: z.array(z.union([playerSchema.shape.id, z.literal("")])).length(4),
  totals: z.array(z.string().max(4)).length(4),
});
export function isMeetingPage(path: string) {
  return /^\/(checkin|score|live)\/?$/.test(path);
}
export function rememberMeetingPage(path: string) {
  try {
    sessionStorage.setItem(RETURN_STORAGE, path);
  } catch {
    /* Navigation still works without storage. */
  }
}
const resultsSchema = z.object({
  status: z.literal(200),
  meetingId: z.string(),
  date: z.iso.date(),
  tables: z
    .array(
      z.object({
        table: z.number().int().positive(),
        seats: z
          .array(
            playerSchema.extend({
              total: z.number().int().min(0).max(820),
              net: z.number().int(),
            }),
          )
          .length(4),
      }),
    )
    .superRefine((tables, ctx) => {
      const numbers = new Set<number>();
      for (const table of tables) {
        if (
          numbers.has(table.table) ||
          new Set(table.seats.map((s) => s.id)).size !== 4 ||
          table.seats.reduce((n, s) => n + s.total, 0) !== 820 ||
          table.seats.some((s) => s.net !== s.total - 205)
        )
          ctx.addIssue({
            code: "custom",
            message: "An officer needs to recheck tonight’s results.",
          });
        numbers.add(table.table);
      }
    }),
});
export type Results = z.infer<typeof resultsSchema>;
export async function getResults(
  url: string,
  signal?: AbortSignal,
): Promise<Results> {
  const target = new URL(url);
  target.searchParams.set("r", "results");
  const { body, reply } = await readResponse(target.href, {
    signal,
    cache: "no-store",
  });
  if (reply.status !== 200)
    throw new Error(reply.message || "Could not load tonight’s scores.");
  return resultsSchema.parse(body);
}
