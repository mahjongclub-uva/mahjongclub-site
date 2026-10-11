import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKS, GLYPHS, INKS, starterAvatar } from "./avatar.ts";

test("a player's starter tile is the same on every phone and varies between players", () => {
  assert.deepEqual(starterAvatar("p014"), starterAvatar("p014"));
  const tiles = Array.from({ length: 40 }, (_, i) =>
    starterAvatar(`p${String(i + 1).padStart(3, "0")}`),
  );
  for (const tile of tiles) {
    assert.ok(GLYPHS.includes(tile.glyph));
    assert.ok(tile.ink in INKS);
    assert.ok(tile.back in BACKS);
  }
  const looks = new Set(tiles.map((t) => `${t.glyph}.${t.ink}.${t.back}`));
  assert.ok(looks.size > 20, `only ${looks.size} different tiles`);
  assert.equal(new Set(tiles.map((t) => t.glyph)).size, GLYPHS.length);
});
