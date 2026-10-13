import type { Meeting, Player, Results, Room } from "./meetingSchemas.ts";
export type {
  Meeting,
  Player,
  Results,
  ResultTable,
  Room,
} from "./meetingSchemas.ts";
const schemas = () => import("./meetingSchemas.ts");
export const WINDS = ["East", "South", "West", "North"] as const;
import type { Meeting as ScheduledMeeting } from "@/lib/schema";

export type Seat = { id: string; total: number };
export type Submission = {
  r: "results";
  meetingId: string;
  submissionId: string;
  seats: Seat[];
};
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
  // Fetched alongside the request, so checking the reply adds no wait.
  const parsers = schemas();
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
  const reply = (await parsers).replySchema.parse(body);
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
  return (await schemas()).meetingSchema.parse(body);
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
    error.name !== "ZodError" &&
    error.name !== "TimeoutError" &&
    error.name !== "TypeError"
    ? error.message
    : "Could not confirm the request. Please retry or ask an officer.";
}

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
// Matches the backend's check-in window: from 30 minutes before the start
// until the end.
export function inCheckIn(meeting: ScheduledMeeting, now: number) {
  return (
    now >= Date.parse(meeting.start) - 30 * 60000 &&
    now < Date.parse(meeting.end ?? meeting.start)
  );
}
/**
 * Tonight's meeting as the calendar has it, so check-in can start while the
 * meeting service wakes up. Not for a phone that already has tonight's
 * player: it waits for the real reply, which knows whether they're in.
 */
export function provisionalMeeting(
  schedule: ScheduledMeeting[],
  now: number,
): Meeting | null {
  const tonight = schedule.find((m) => inCheckIn(m, now));
  if (!tonight) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(CHECKED_IN) || "null");
    // A calendar meeting's id ends in its start time.
    if (saved?.meetingId?.endsWith(":" + Date.parse(tonight.start)))
      return null;
  } catch {
    return null;
  }
  return {
    status: 200,
    open: true,
    checkinsOpen: true,
    meetingId: null,
    // The start carries the club's own offset, so this is its local date.
    date: tonight.start.slice(0, 10),
    semester: null,
    players: [],
  };
}
export type SavedPlayer = { meetingId: string | null; player: Player };
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
  window.dispatchEvent(
    new CustomEvent(PLAYER_EVENT, {
      detail: player && { meetingId: meeting.meetingId, player },
    }),
  );
}
export const DRAFT_STORAGE = "club-table-draft";
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
  tonight: "/meeting/tonight/",
  score: "/meeting/score/",
} as const;
export function isMeetingPage(path: string) {
  return (
    /^\/meeting(\/(checkin|tables|tonight|score|table\/\d{1,2}))?\/?$/.test(
      path,
    ) || /^\/(checkin|score|tables|live)\/?$/.test(path)
  );
}
/** The table this player sits at tonight, if any. */
export function seatedRoom(rooms: Room[] | undefined, id?: string) {
  return rooms?.find((room) => room.seats.some((seat) => seat.id === id));
}
/** Where a checked-in player goes next tonight. */
export function playerNext(meeting: Meeting, id: string) {
  const table = seatedRoom(meeting.rooms, id)?.table;
  return table
    ? { href: MEETING_PATHS.table(table), label: `Return to Table ${table}` }
    : meeting.rooms
      ? { href: MEETING_PATHS.tables, label: "Find a table" }
      : { href: MEETING_PATHS.score, label: "Record a table" };
}
/**
 * Where the site's meeting shortcut leads this phone. Only a confirmed player
 * is named, so a shared phone never offers the last person's table.
 */
export function meetingShortcut(meeting: Meeting, player: Player | null) {
  if (!player)
    return { player, label: "Check in", href: MEETING_PATHS.checkin };
  if (!meeting.rooms)
    return { player, label: "Meeting", href: MEETING_PATHS.hub };
  const table = seatedRoom(meeting.rooms, player.id)?.table;
  return table
    ? { player, label: `Table ${table}`, href: MEETING_PATHS.table(table) }
    : { player, label: "Tables", href: MEETING_PATHS.tables };
}
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
  return (await schemas()).resultsSchema.parse(body);
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
