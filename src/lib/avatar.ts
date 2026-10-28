/**
 * A player's tile on the meeting pages: a face, drawn in that face's own ink,
 * on the colour of the tile's back. Every player starts with a tile picked
 * from their opaque id, so every phone draws the same one, and can make their
 * own for the night. A tile travels as a code, "face.back"; the Apps Script
 * keeps the same lists in TILE_PARTS.
 */
import { halloweenWeek } from "./season.ts";

const RED = "oklch(0.55 0.2 28)";
const BLUE = "oklch(0.48 0.16 255)";
const GREEN = "oklch(0.5 0.14 160)";
const INK = "oklch(0.27 0.03 270)";
// Dark enough for 4.5:1 on the tile face, which 中 and 發 need as text.
const GOLD = "oklch(0.52 0.12 75)";
const ORANGE = "oklch(0.6 0.17 50)";

// Each face keeps one ink, as a real tile does: 中 is always red.
const PICTURES = {
  paw: INK,
  star: GOLD,
  heart: RED,
  moon: GOLD,
  sun: GOLD,
  flower: RED,
  clover: GREEN,
  cherry: RED,
  crown: GOLD,
  cloud: BLUE,
  apple: RED,
  coin: BLUE,
  sprout: GREEN,
} as const;
// Two of the dragons, as they appear on the tiles. The winds stay off player
// tiles, since the table page marks each seat with its wind.
export const CHARACTERS = { zhong: "中", fa: "發" } as const;
// Offered only in Halloween week, first in the rack, and never a starter.
const HALLOWEEN = { pumpkin: ORANGE, ghost: INK, spider: INK } as const;
export type Face =
  keyof typeof PICTURES | keyof typeof CHARACTERS | keyof typeof HALLOWEEN;
export const INKS: Record<Face, string> = {
  ...HALLOWEEN,
  ...PICTURES,
  zhong: RED,
  fa: GREEN,
};
const SEASONAL = Object.keys(HALLOWEEN) as Face[];
/** Every face the service accepts; TILE_PARTS in the Apps Script matches it. */
export const ALL_FACES = Object.keys(INKS) as Face[];
const FACES = ALL_FACES.filter((face) => !SEASONAL.includes(face));
/** The faces a player can pick at `now`: Halloween's in Halloween week. */
export const facesOn = (now: Date) => (halloweenWeek(now) ? ALL_FACES : FACES);
export const BACKS = {
  coral: "oklch(0.74 0.16 30)",
  sky: "oklch(0.8 0.1 230)",
  butter: "oklch(0.88 0.15 95)",
  lilac: "oklch(0.78 0.1 300)",
  mint: "oklch(0.84 0.12 160)",
  midnight: "oklch(0.38 0.07 300)",
} as const;

export type Avatar = { face: Face; back: keyof typeof BACKS };
export const BACK_NAMES = Object.keys(BACKS) as Avatar["back"][];

export function starterAvatar(id: string): Avatar {
  // FNV-1a: small, stable, and spreads ids like p001 and p002 apart.
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash >>>= 0;
  return {
    face: FACES[hash % FACES.length],
    back: BACK_NAMES[(hash >>> 5) % BACK_NAMES.length],
  };
}

export const tileCode = (tile: Avatar) => `${tile.face}.${tile.back}`;

/** A code read back as a tile; any part this site does not know, or a
 * seasonal face out of season, falls back to the starter's. */
export function parseTile(
  code: string | undefined,
  id: string,
  now = new Date(),
): Avatar {
  const starter = starterAvatar(id);
  const [face, back] = (code ?? "").split(".");
  const known = <T extends string>(
    list: readonly T[],
    value: string,
    own: T,
  ) => (list.includes(value as T) ? (value as T) : own);
  return {
    face: known(facesOn(now), face, starter.face),
    back: known(BACK_NAMES, back, starter.back),
  };
}
