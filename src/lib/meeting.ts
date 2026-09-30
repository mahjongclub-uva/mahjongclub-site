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
export const CODE_EVENT = "club-meeting-access";
export const CODE_STORAGE = "club-meeting-code";
export const PENDING_STORAGE = "club-pending-table";

export function rememberedCode(raw: string | null, now = Date.now()): string {
  try {
    const value = JSON.parse(raw || "null");
    return value &&
      typeof value.code === "string" &&
      Number.isFinite(value.savedAt) &&
      now >= value.savedAt &&
      now - value.savedAt < 12 * 3600000
      ? value.code
      : "";
  } catch {
    return "";
  }
}

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
  code: string,
  signal?: AbortSignal,
): Promise<Meeting> {
  const target = new URL(url);
  target.searchParams.set("r", "meeting");
  if (code) target.searchParams.set("k", code);
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
export async function postMeeting(url: string, code: string, data: object) {
  const { reply } = await readResponse(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ ...data, k: code }),
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
