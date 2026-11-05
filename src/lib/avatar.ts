/**
 * A player's tile on the meeting pages: a painted face on the
 * colour of the tile's back. Every player starts with a tile picked
 * from their opaque id, so every phone draws the same one, and can make their
 * own for the night. A tile travels as a code, "face.back"; the Apps Script
 * keeps the same lists in TILE_PARTS.
 */
import { COLLAB_NIGHTS, seasonOn, type Collab } from "./season.ts";

// Painted faces, one file each in public/tiles/painted, in their own colours.
// Six to a row: symbols, fruit, animals, then fortune with 中 發 福. A starter is
// picked from this list by index, so any change to it reshuffles every player's
// starter tile.
const PICTURES = [
  "star",
  "moon",
  "sun",
  "heart",
  "lotus",
  "maple",
  "apple",
  "watermelon",
  "peach",
  "mandarin",
  "banana",
  "grapes",
  "dog",
  "cat",
  "bunny",
  "butterfly",
  "fish",
  "bird",
  "sprout",
  "coin",
  "yuanbao",
] as const;
// Two of the dragons, as they appear on the tiles, and 福 for fortune, as
// pasted on doors at New Year. The winds stay off player tiles, since the
// table page marks each seat with its wind. Painted too, and a Chinese reader
// checks any new one before it goes in, since a wrong stroke reads as a mistake.
const CHARACTERS = ["zhong", "fa", "fu"] as const;
// Offered only in Halloween week, first in the rack, and never a starter.
const HALLOWEEN = [
  "pumpkin",
  "ghost",
  "spider",
  "bat",
  "hat",
  "skull",
] as const;
// A partner's faces, offered only on its collab night, first in the rack,
// tagged with the club's name, and never a starter. TILE_PARTS in Club.gs must
// list them too, so new picks mean redeploying the Apps Script.
const HKSA = [
  "bauhinia",
  "eggtart",
  "fishball",
  "dolphin",
  "tram",
  "neon",
] as const;
const COLLAB_FACES: Record<Collab, readonly Face[]> = { hksa: HKSA };
export type Face =
  | (typeof PICTURES)[number]
  | (typeof CHARACTERS)[number]
  | (typeof HALLOWEEN)[number]
  | (typeof HKSA)[number];
const FACES: readonly Face[] = [...PICTURES, ...CHARACTERS];
/** Every face the service accepts; TILE_PARTS in the Apps Script matches it. */
export const ALL_FACES: readonly Face[] = [...HALLOWEEN, ...HKSA, ...FACES];
/** The faces a player can pick at `now`: Halloween's in Halloween week, a
 * partner's on its collab night, first. */
export const facesOn = (now: Date) => {
  const season = seasonOn(now, COLLAB_NIGHTS);
  const tonight =
    season === "halloween" ? HALLOWEEN : (COLLAB_FACES[season as Collab] ?? []);
  return [...tonight, ...FACES];
};
/** The partner whose night a face belongs to, for its set in the rack. */
export const collabOf = (face: Face) =>
  (Object.keys(COLLAB_FACES) as Collab[]).find((collab) =>
    COLLAB_FACES[collab].includes(face),
  );
// Backs from the game and the club: each one at least 2:1 against the ivory
// face (avatar.test), so a tile's edge never melts into its face.
export const BACKS = {
  // In hue order, round the colour wheel, as the picker lays them out.
  vermilion: "oklch(0.6 0.19 32)", // the ink of 中
  tangerine: "oklch(0.68 0.15 50)", // painted terracotta
  gold: "oklch(0.76 0.15 82)", // Fuzhou's wildcard
  bamboo: "oklch(0.68 0.14 125)", // a warm leaf green
  mint: "oklch(0.74 0.13 165)",
  jade: "oklch(0.48 0.08 170)", // the club's own tile backs
  sea: "oklch(0.66 0.1 205)", // a deeper celadon glaze
  sky: "oklch(0.72 0.09 238)", // porcelain blue
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
