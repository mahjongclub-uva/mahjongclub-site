/**
 * A player's tile on the meeting pages: a glyph, its ink, and the colour of
 * the tile's back. Until players can choose their own, each gets a starter
 * tile picked from their opaque id, so every phone draws the same one.
 */
export const GLYPHS = ["龍", "東", "中", "發", "兔", "貓", "福", "虎"] as const;
export const INKS = {
  red: "oklch(0.55 0.2 28)",
  blue: "oklch(0.48 0.16 255)",
  green: "oklch(0.5 0.14 160)",
  ink: "oklch(0.27 0.03 270)",
} as const;
export const BACKS = {
  coral: "oklch(0.74 0.16 30)",
  sky: "oklch(0.8 0.1 230)",
  butter: "oklch(0.88 0.15 95)",
  lilac: "oklch(0.78 0.1 300)",
  mint: "oklch(0.84 0.12 160)",
} as const;

export type Avatar = {
  glyph: (typeof GLYPHS)[number];
  ink: keyof typeof INKS;
  back: keyof typeof BACKS;
};

export function starterAvatar(id: string): Avatar {
  // FNV-1a: small, stable, and spreads ids like p001 and p002 apart.
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash >>>= 0;
  const inks = Object.keys(INKS) as Avatar["ink"][];
  const backs = Object.keys(BACKS) as Avatar["back"][];
  return {
    glyph: GLYPHS[hash % GLYPHS.length],
    ink: inks[(hash >>> 3) % inks.length],
    back: backs[(hash >>> 5) % backs.length],
  };
}
