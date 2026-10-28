import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  ALL_FACES,
  BACK_NAMES,
  facesOn,
  parseTile,
  starterAvatar,
  tileCode,
} from "./avatar.ts";

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
  assert.deepEqual(parseTile("sun.mint", "p014"), {
    face: "sun",
    back: "mint",
  });
  assert.deepEqual(parseTile("unicorn.mint", "p014"), {
    ...starter,
    back: "mint",
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
    { face: ALL_FACES, back: BACK_NAMES },
  );
});

test("Halloween's faces are offered that week only and are never a starter", () => {
  const halloween = new Date(2026, 9, 30, 18);
  const after = new Date(2026, 10, 6, 18);
  assert.ok(facesOn(halloween).includes("ghost"));
  assert.ok(!facesOn(after).includes("ghost"));
  assert.ok(!facesOn(new Date(2026, 9, 23)).includes("ghost"));
  for (let i = 1; i <= 200; i++)
    assert.ok(
      facesOn(after).includes(
        starterAvatar(`p${String(i).padStart(3, "0")}`).face,
      ),
    );
  assert.equal(parseTile("ghost.midnight", "p014", halloween).face, "ghost");
  assert.deepEqual(parseTile("ghost.midnight", "p014", after), {
    face: starterAvatar("p014").face,
    back: "midnight",
  });
});
