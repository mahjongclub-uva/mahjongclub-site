import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { PARTS, parseTile, starterAvatar, tileCode } from "./avatar.ts";

test("a player's starter tile is the same on every phone and varies between players", () => {
  assert.deepEqual(starterAvatar("p014"), starterAvatar("p014"));
  const tiles = Array.from({ length: 40 }, (_, i) =>
    starterAvatar(`p${String(i + 1).padStart(3, "0")}`),
  );
  for (const tile of tiles)
    assert.deepEqual(parseTile(tileCode(tile), "p001"), tile);
  const looks = new Set(tiles.map(tileCode));
  assert.ok(looks.size > 20, `only ${looks.size} different tiles`);
  assert.ok(new Set(tiles.map((t) => t.face)).size > 10);
});

test("a code with a part this site does not know keeps the starter's part", () => {
  const starter = starterAvatar("p014");
  assert.deepEqual(parseTile("sun.gold.mint", "p014"), {
    face: "sun",
    ink: "gold",
    back: "mint",
  });
  assert.deepEqual(parseTile("unicorn.gold.plaid", "p014"), {
    ...starter,
    ink: "gold",
  });
  assert.deepEqual(parseTile(undefined, "p014"), starter);
});

test("the Apps Script accepts exactly the tiles this site can draw", () => {
  const script = readFileSync(
    new URL("../../apps-script/Club.gs", import.meta.url),
    "utf8",
  );
  const listed = script.match(/const TILE_PARTS = (\{[^}]*\});/);
  assert.ok(listed, "TILE_PARTS is missing from Club.gs");
  assert.deepEqual(
    JSON.parse(JSON.stringify(vm.runInNewContext(`(${listed[1]})`))),
    {
      face: PARTS.face,
      ink: PARTS.ink,
      back: PARTS.back,
    },
  );
});
