import { z } from "zod";

const playerSchema = z.object({
  id: z.string().regex(/^p\d{3,}$/),
  display: z.string().min(1),
});
const savedResultSchema = z.object({
  table: z.number().int().positive(),
  at: z.number(),
  hands: z.number().int(),
  totals: z.array(playerSchema.extend({ total: z.number().int() })),
});
export type SavedResult = z.infer<typeof savedResultSchema>;
const roomSchema = z.object({
  table: z.number().int().positive(),
  seats: z.array(playerSchema).max(4),
  hands: z.array(
    z.object({
      id: z.string(),
      winner: playerSchema.shape.id,
      each: z.number().int().positive(),
    }),
  ),
  totals: z.array(
    z.object({ id: playerSchema.shape.id, total: z.number().int() }),
  ),
  // The table's last save, so every seated phone can show it.
  saved: savedResultSchema.nullable().optional(),
});
export type Room = z.infer<typeof roomSchema>;
const replySchema = z.object({
  status: z.number().int(),
  message: z.string().optional(),
  player: playerSchema.optional(),
  suggestions: z.array(playerSchema).optional(),
  table: z.number().int().positive().optional(),
  saved: z.number().int().positive().nullable().optional(),
  rooms: z.array(roomSchema).optional(),
});
const meetingSchema = z.object({
  status: z.literal(200),
  open: z.boolean(),
  checkinsOpen: z.boolean(),
  meetingId: z.string().nullable(),
  date: z.string().nullable(),
  semester: z.string().nullable(),
  players: z.array(playerSchema).optional(),
  // Absent until the Apps Script with table rooms is deployed.
  rooms: z.array(roomSchema).optional(),
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
        total: z.number().int(),
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
  if (seats.some((seat) => !Number.isSafeInteger(seat.total)))
    return "Enter whole totals for all four players. Negative totals are allowed.";
  if (seats.reduce((sum, seat) => sum + seat.total, 0) !== 820)
    return "The four totals must add up to 820.";
  return null;
}

export const CARD_VALUES = [50, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

async function readResponse(
  url: string,
  init: RequestInit = {},
  timeout = 25000,
) {
  const response = await fetch(url, {
    ...init,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.any(
      [init.signal, AbortSignal.timeout(timeout)].filter((s) => s != null),
    ),
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
export async function getRooms(url: string, signal?: AbortSignal) {
  const target = new URL(url);
  target.searchParams.set("r", "rooms");
  // Short, so one hung request cannot freeze a table's view for long.
  const { reply } = await readResponse(
    target.href,
    { signal, cache: "no-store" },
    10000,
  );
  if (reply.status !== 200 || !reply.rooms)
    throw new Error(reply.message || "Could not load the tables.");
  return reply.rooms;
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

// Who checked in on this phone. Survives closing the tab, but only for this
// meeting and only while the meeting still lists the player as checked in.
const CHECKED_IN = "club-checked-in";
export function savedPlayer(meeting: Meeting): Player | null {
  try {
    const saved = JSON.parse(localStorage.getItem(CHECKED_IN) || "null");
    return saved?.meetingId === meeting.meetingId &&
      meeting.players?.some((p) => p.id === saved.player?.id)
      ? saved.player
      : null;
  } catch {
    return null;
  }
}
// The last result saved from this phone, so a player who leaves a table
// still sees what was saved after they reach the lobby.
const LAST_RESULT = "club-last-result";
export function lastResult(
  meeting: Meeting,
  playerId: string,
): SavedResult | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_RESULT) || "null");
    // Scoped to the player too, because phones and the iPad get shared.
    return saved?.meetingId === meeting.meetingId && saved.playerId === playerId
      ? savedResultSchema.parse(saved.result)
      : null;
  } catch {
    return null;
  }
}
export function forgetResult() {
  try {
    localStorage.removeItem(LAST_RESULT);
  } catch {
    /* Nothing was kept. */
  }
}
export function rememberResult(
  meeting: Meeting,
  playerId: string,
  result: SavedResult,
) {
  try {
    localStorage.setItem(
      LAST_RESULT,
      JSON.stringify({ meetingId: meeting.meetingId, playerId, result }),
    );
  } catch {
    /* The receipt still shows until the page reloads. */
  }
}
export function rememberPlayer(meeting: Meeting, player: Player | null) {
  try {
    localStorage.setItem(
      CHECKED_IN,
      JSON.stringify(player && { meetingId: meeting.meetingId, player }),
    );
  } catch {
    /* The page still works until it reloads. */
  }
}
export const DRAFT_STORAGE = "club-table-draft";
export const draftSchema = z.object({
  meetingId: z.string(),
  ids: z.array(z.union([playerSchema.shape.id, z.literal("")])).length(4),
  totals: z.array(z.string().max(17)).length(4),
});
export function isMeetingPage(path: string) {
  return /^\/(checkin|score|tables|live)\/?$/.test(path);
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
  tables: z.array(
    z.object({
      table: z.number().int().positive(),
      seats: z
        .array(
          playerSchema.extend({
            optOut: z.boolean().optional(),
            total: z.number().int(),
            net: z.number().int(),
          }),
        )
        .length(4),
    }),
  ),
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
