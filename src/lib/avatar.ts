/**
 * A player's tile on the meeting pages: a face, its ink, and the colour of
 * the tile's back. Every player starts with a tile picked from their opaque
 * id, so every phone draws the same one, and can make their own for the night.
 * A tile travels as a code, "face.ink.back"; the Apps Script keeps the same
 * lists in TILE_PARTS.
 */
const PICTURES = [
  "paw",
  "star",
  "heart",
  "moon",
  "sun",
  "flower",
  "clover",
  "butterfly",
  "flame",
  "cloud",
  "apple",
  "coin",
  "sprout",
] as const;
// The winds and two of the dragons, as they appear on the tiles.
export const CHARACTERS = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
  zhong: "中",
  fa: "發",
} as const;
export const FACES = [...PICTURES, ...Object.keys(CHARACTERS)] as Face[];
export const INKS = {
  red: "oklch(0.55 0.2 28)",
  blue: "oklch(0.48 0.16 255)",
  green: "oklch(0.5 0.14 160)",
  ink: "oklch(0.27 0.03 270)",
  gold: "oklch(0.64 0.13 78)",
} as const;
export const BACKS = {
  coral: "oklch(0.74 0.16 30)",
  sky: "oklch(0.8 0.1 230)",
  butter: "oklch(0.88 0.15 95)",
  lilac: "oklch(0.78 0.1 300)",
  mint: "oklch(0.84 0.12 160)",
} as const;

export type Face = (typeof PICTURES)[number] | keyof typeof CHARACTERS;
export type Avatar = {
  face: Face;
  ink: keyof typeof INKS;
  back: keyof typeof BACKS;
};
export const PARTS = {
  face: FACES,
  ink: Object.keys(INKS) as Avatar["ink"][],
  back: Object.keys(BACKS) as Avatar["back"][],
};

export function starterAvatar(id: string): Avatar {
  // FNV-1a: small, stable, and spreads ids like p001 and p002 apart.
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash >>>= 0;
  return {
    face: FACES[hash % FACES.length],
    ink: PARTS.ink[(hash >>> 3) % PARTS.ink.length],
    back: PARTS.back[(hash >>> 5) % PARTS.back.length],
  };
}

export const tileCode = (tile: Avatar) =>
  `${tile.face}.${tile.ink}.${tile.back}`;

/** A code read back as a tile; any part this site does not know falls back to the starter's. */
export function parseTile(code: string | undefined, id: string): Avatar {
  const starter = starterAvatar(id);
  const [face, ink, back] = (code ?? "").split(".");
  const known = <T extends string>(
    list: readonly T[],
    value: string,
    own: T,
  ) => (list.includes(value as T) ? (value as T) : own);
  return {
    face: known(PARTS.face, face, starter.face),
    ink: known(PARTS.ink, ink, starter.ink),
    back: known(PARTS.back, back, starter.back),
  };
}
