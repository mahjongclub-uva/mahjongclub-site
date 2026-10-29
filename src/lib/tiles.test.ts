import { test } from "node:test";
import assert from "node:assert/strict";

test("this phone's tiles come from storage once, and a choice is kept", async () => {
  let reads = 0;
  const store: Record<string, string> = {
    "club-tiles": JSON.stringify({ p001: "sun.mint" }),
  };
  globalThis.localStorage = {
    getItem: (key: string) => (reads++, store[key] ?? null),
    setItem: (key: string, value: string) => void (store[key] = value),
  } as Storage;
  const { chosenTile, chooseTile } = await import("./tiles.ts");
  for (let i = 0; i < 20; i++) assert.equal(chosenTile("p001"), "sun.mint");
  chooseTile("p002", "moon.sky");
  assert.equal(chosenTile("p002"), "moon.sky");
  assert.equal(reads, 1);
  assert.deepEqual(JSON.parse(store["club-tiles"]), {
    p001: "sun.mint",
    p002: "moon.sky",
  });
});
