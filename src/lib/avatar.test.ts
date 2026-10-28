import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  ALL_FACES,
  BACKS,
  BACK_NAMES,
  CHARACTERS,
  INKS,
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

// Relative luminance of an "oklch(L C H)" ink, through OKLab to linear sRGB.
function luminance(ink: string) {
  const [l, c, h] = ink.match(/[\d.]+/g)!.map(Number);
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S);
  const g = clamp(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S);
  const bl = clamp(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

test("every ink reads on the ivory face: 3:1 for pictures, 4.5:1 for characters", () => {
  // The face's middle tone, #f8f6ee, where the picture sits.
  const face = 0.2126 * 0.9387 + 0.7152 * 0.9216 + 0.0722 * 0.855;
  for (const [name, ink] of Object.entries(INKS)) {
    const ratio = (face + 0.05) / (luminance(ink) + 0.05);
    const floor = name in CHARACTERS ? 4.5 : 3;
    assert.ok(ratio >= floor, `${name} is ${ratio.toFixed(2)}:1`);
  }
});

test("every back stands out from the ivory face: 2:1", () => {
  const face = 0.2126 * 0.9387 + 0.7152 * 0.9216 + 0.0722 * 0.855;
  for (const [name, back] of Object.entries(BACKS)) {
    const ratio = (face + 0.05) / (luminance(back) + 0.05);
    assert.ok(ratio >= 2, `${name} is ${ratio.toFixed(2)}:1`);
  }
});
