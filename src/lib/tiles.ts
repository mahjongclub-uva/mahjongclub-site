// Tonight's tiles. Each phone keeps the tiles its players made, keyed by
// player id so Switch never hands one player's tile to the next; everyone
// else's come from the meeting service's replies and last until a reload.
const MINE = "club-tiles";
let tonight: Record<string, string> = {};
let version = 0;
const listeners = new Set<() => void>();

function changed() {
  version++;
  for (const listener of listeners) listener();
}

export function subscribeTiles(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const tilesVersion = () => version;

// Read from storage once: every tile on the page asks on every render.
let saved: Record<string, string> | undefined;
function mine(): Record<string, string> {
  if (saved) return saved;
  try {
    const stored = JSON.parse(localStorage.getItem(MINE) || "{}");
    saved = stored && typeof stored === "object" ? stored : {};
  } catch {
    saved = {};
  }
  return saved!;
}

/** The code this player chose here, or the one the service has for them. */
export const chosenTile = (id: string): string | undefined =>
  mine()[id] ?? tonight[id];
export const madeHere = (id: string): string | undefined => mine()[id];
export const serviceTile = (id: string): string | undefined => tonight[id];

export function chooseTile(id: string, code: string) {
  saved = { ...mine(), [id]: code };
  try {
    localStorage.setItem(MINE, JSON.stringify(saved));
  } catch {
    // Private mode: the tile still shows until the page reloads.
  }
  changed();
}

export function addTonightTiles(tiles: Record<string, string> | undefined) {
  if (
    !tiles ||
    Object.entries(tiles).every(([id, code]) => tonight[id] === code)
  )
    return;
  tonight = { ...tonight, ...tiles };
  changed();
}
