import { z } from "zod";

const playerSchema = z.object({
  id: z.string().regex(/^p\d{3,}$/),
  display: z.string().min(1),
});
// One saved table: a block in Points Tracking.
const resultTableSchema = z.object({
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
});
export type ResultTable = z.infer<typeof resultTableSchema>;
// A seat at a physical table: wind 0-3 is East, South, West, North.
const seatSchema = playerSchema.extend({
  wind: z.number().int().min(0).max(3),
  optOut: z.boolean().optional(),
});
export const WINDS = ["East", "South", "West", "North"] as const;
const roomSchema = z.object({
  table: z.number().int().positive(),
  // Which group's session this is; it goes up each time the table is ended.
  session: z.number().int().positive(),
  seats: z.array(seatSchema).max(4),
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
  // The previous session's final summary, kept after its players are released.
  ended: z
    .object({
      session: z.number().int(),
      lastHandId: z.string().nullable(),
      sheetTable: z.number().int().positive().nullable(),
      at: z.number(),
      by: z.string(),
      games: z.number().int(),
      totals: z.array(seatSchema.extend({ total: z.number().int() })),
    })
    .nullable(),
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
  // Tonight's saved tables, read together with the rooms.
  results: z.array(resultTableSchema).nullable().optional(),
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
  return { rooms: reply.rooms, results: reply.results ?? null };
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
// A refresh keeps the player; reopening the browser asks "Continue as …?"
// first, so a shared phone never acts as the last person by surprise.
const CONFIRMED = "club-player-confirmed";
export function playerConfirmed() {
  try {
    return sessionStorage.getItem(CONFIRMED) === "1";
  } catch {
    return false;
  }
}
export function confirmPlayer() {
  try {
    sessionStorage.setItem(CONFIRMED, "1");
  } catch {
    /* The question just comes back on the next visit. */
  }
}
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
/** Fired when this phone's player changes, so the header can follow. */
export const PLAYER_EVENT = "club-player";
export function rememberPlayer(meeting: Meeting, player: Player | null) {
  try {
    if (player) sessionStorage.setItem(CONFIRMED, "1");
    else sessionStorage.removeItem(CONFIRMED);
    localStorage.setItem(
      CHECKED_IN,
      JSON.stringify(player && { meetingId: meeting.meetingId, player }),
    );
  } catch {
    /* The page still works until it reloads. */
  }
  window.dispatchEvent(new Event(PLAYER_EVENT));
}
export const DRAFT_STORAGE = "club-table-draft";
export const draftSchema = z.object({
  meetingId: z.string(),
  ids: z.array(z.union([playerSchema.shape.id, z.literal("")])).length(4),
  totals: z.array(z.string().max(17)).length(4),
});
// Matches MAX_TABLES in apps-script/Club.gs; /meeting/table/N is generated
// for each.
export const MAX_TABLES = 12;
// Every meeting page lives under /meeting. The old top-level paths, still
// printed on QR codes, are forwarding pages.
export const MEETING_PATHS = {
  hub: "/meeting/",
  checkin: "/meeting/checkin/",
  tables: "/meeting/tables/",
  table: (table: number) => `/meeting/table/${table}/`,
  standings: "/meeting/standings/",
  score: "/meeting/score/",
} as const;
export function isMeetingPage(path: string) {
  return (
    /^\/meeting(\/(checkin|tables|standings|score|table\/\d{1,2}))?\/?$/.test(
      path,
    ) || /^\/(checkin|score|tables|live)\/?$/.test(path)
  );
}
/**
 * Where the site's meeting shortcut leads this phone. Only a confirmed player
 * is named, so a shared phone never offers the last person's table.
 */
export function meetingShortcut(meeting: Meeting, player: Player | null) {
  if (!player) return { player, label: "Check in", href: MEETING_PATHS.hub };
  if (!meeting.rooms)
    return { player, label: "Meeting", href: MEETING_PATHS.hub };
  const table = meeting.rooms.find((room) =>
    room.seats.some((seat) => seat.id === player.id),
  )?.table;
  return table
    ? { player, label: `Table ${table}`, href: MEETING_PATHS.table(table) }
    : { player, label: "Tables", href: MEETING_PATHS.tables };
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
  tables: z.array(resultTableSchema),
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

/** A computing ID as typed, minus a pasted "@virginia.edu". */
export function cleanComputingId(raw: string) {
  return raw.trim().replace(/@virginia\.edu$/i, "");
}
export function computingIdError(id: string): string | null {
  if (!id) return "Enter your computing ID.";
  if (id.includes("@"))
    return "Use only the part before @virginia.edu, for example abc2de.";
  if (!/^[a-z][a-z0-9]*$/i.test(id))
    return "A computing ID starts with letters, then numbers, for example abc2de.";
  return null;
}
