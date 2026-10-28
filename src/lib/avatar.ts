/**
 * A player's tile on the meeting pages: a face, drawn in that face's own ink,
 * on the colour of the tile's back. Every player starts with a tile picked
 * from their opaque id, so every phone draws the same one, and can make their
 * own for the night. A tile travels as a code, "face.back"; the Apps Script
 * keeps the same lists in TILE_PARTS.
 */
import { halloweenWeek } from "./season.ts";

const RED = "oklch(0.52 0.2 28)";
const GREEN = "oklch(0.48 0.14 160)";
const INK = "oklch(0.27 0.03 270)";
const ORANGE = "oklch(0.58 0.175 42)"; // pumpkin, the reddest orange

// Each face keeps one ink, as a real tile does: 中 is always red. Each is
// its own colour, and every one reaches 3:1 on the ivory face and on the
// meeting page, where the Icon rack shows it bare (avatar.test). Every face
// sits on a thin shadow of its own ink; one too pale to reach it, like a
// real peach, keeps its colour and gets a deeper shadow (RIMS) that does.
const PICTURES = {
  paw: "oklch(0.45 0.07 50)", // brown
  star: "oklch(0.86 0.16 95)", // yellow
  heart: "oklch(0.57 0.2 12)", // rose
  moon: "oklch(0.45 0.13 275)", // indigo
  sun: "oklch(0.8 0.16 72)", // golden
  flower: "oklch(0.83 0.08 355)", // sakura pink
  clover: "oklch(0.5 0.14 155)", // deep green
  banana: "oklch(0.86 0.15 100)", // yellow
  crown: "oklch(0.78 0.15 82)", // gold
  cloud: "oklch(0.82 0.07 235)", // baby blue
  apple: RED,
  peach: "oklch(0.74 0.13 28)", // for long life
  mandarin: "oklch(0.7 0.17 58)", // orange, for luck at New Year
  coin: "oklch(0.6 0.1 62)", // bronze, as old cash coins are
  sprout: "oklch(0.58 0.15 135)", // leaf green
} as const;
// Two of the dragons, as they appear on the tiles, and 福 for fortune, as
// pasted on doors at New Year. The winds stay off player tiles, since the
// table page marks each seat with its wind.
export const CHARACTERS = { zhong: "中", fa: "發", fu: "福" } as const;
// Offered only in Halloween week, first in the rack, and never a starter.
const HALLOWEEN = {
  pumpkin: ORANGE,
  ghost: INK,
  spider: INK,
  bat: "oklch(0.36 0.09 295)", // deep violet
  hat: INK, // a witch's, with an orange band
  potion: "oklch(0.58 0.12 185)", // teal
} as const;
export type Face =
  keyof typeof PICTURES | keyof typeof CHARACTERS | keyof typeof HALLOWEEN;
export const INKS: Record<Face, string> = {
  ...HALLOWEEN,
  ...PICTURES,
  zhong: RED,
  fa: GREEN,
  fu: RED,
};
export const RIMS: Partial<Record<Face, string>> = {
  star: "oklch(0.6 0.13 80)",
  banana: "oklch(0.6 0.12 88)",
  crown: "oklch(0.58 0.12 72)",
  sun: "oklch(0.6 0.15 55)",
  flower: "oklch(0.6 0.13 355)",
  cloud: "oklch(0.6 0.1 240)",
  peach: "oklch(0.58 0.13 24)",
  mandarin: "oklch(0.55 0.15 45)",
};
const SEASONAL = Object.keys(HALLOWEEN) as Face[];
/** Every face the service accepts; TILE_PARTS in the Apps Script matches it. */
export const ALL_FACES = Object.keys(INKS) as Face[];
const FACES = ALL_FACES.filter((face) => !SEASONAL.includes(face));
/** The faces a player can pick at `now`: Halloween's in Halloween week. */
export const facesOn = (now: Date) => (halloweenWeek(now) ? ALL_FACES : FACES);
// Backs from the game and the club: each one at least 2:1 against the ivory
// face (avatar.test), so a tile's edge never melts into its face.
export const BACKS = {
  // In hue order, round the colour wheel, as the picker lays them out.
  vermilion: "oklch(0.6 0.19 32)", // the ink of 中
  tangerine: "oklch(0.73 0.17 55)",
  gold: "oklch(0.76 0.15 82)", // Fuzhou's wildcard
  bamboo: "oklch(0.72 0.17 130)",
  mint: "oklch(0.74 0.13 165)",
  jade: "oklch(0.48 0.08 170)", // the club's own tile backs
  sea: "oklch(0.66 0.1 205)", // a deeper celadon glaze
  sky: "oklch(0.7 0.13 240)",
  cobalt: "oklch(0.5 0.17 262)", // blue-and-white porcelain
  midnight: "oklch(0.34 0.07 285)",
  lavender: "oklch(0.7 0.12 300)",
  plum: "oklch(0.48 0.15 330)", // plum and peony are flower tiles
  peony: "oklch(0.7 0.17 355)",
  walnut: "oklch(0.48 0.08 55)", // a neutral, off the wheel, so last
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
