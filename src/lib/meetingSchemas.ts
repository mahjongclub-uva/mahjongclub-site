import { z } from "zod";

// The meeting service's replies and this phone's saved drafts, checked at the
// boundary. Kept apart from meeting.ts so pages that only link to the meeting
// load zod when a reply actually arrives.
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
// Tiles players made tonight, by player id, as "face.ink.back".
const tilesSchema = z
  .record(playerSchema.shape.id, z.string().max(40))
  .optional();
export const replySchema = z.object({
  status: z.number().int(),
  message: z.string().optional(),
  player: playerSchema.optional(),
  meetingId: z.string().nullable().optional(),
  suggestions: z.array(playerSchema).optional(),
  table: z.number().int().positive().optional(),
  saved: z.number().int().positive().nullable().optional(),
  rooms: z.array(roomSchema).optional(),
  // Tonight's saved tables, read together with the rooms.
  results: z.array(resultTableSchema).nullable().optional(),
  tiles: tilesSchema,
});
export const meetingSchema = z.object({
  status: z.literal(200),
  open: z.boolean(),
  checkinsOpen: z.boolean(),
  meetingId: z.string().nullable(),
  date: z.string().nullable(),
  semester: z.string().nullable(),
  players: z.array(playerSchema).optional(),
  // Absent until the Apps Script with table rooms is deployed.
  rooms: z.array(roomSchema).optional(),
  tiles: tilesSchema,
});
export type Player = z.infer<typeof playerSchema>;
export type Meeting = z.infer<typeof meetingSchema>;

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

export const draftSchema = z.object({
  meetingId: z.string(),
  ids: z.array(z.union([playerSchema.shape.id, z.literal("")])).length(4),
  totals: z.array(z.string().max(17)).length(4),
});

export const resultsSchema = z.object({
  status: z.literal(200),
  meetingId: z.string(),
  date: z.iso.date(),
  tables: z.array(resultTableSchema),
});
export type Results = z.infer<typeof resultsSchema>;
