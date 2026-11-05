"use client";

import { useSyncExternalStore } from "react";
import { BACKS, parseTile, type Avatar } from "@/lib/avatar";
import { chosenTile, subscribeTiles, tilesVersion } from "@/lib/tiles";

// The Halloween decorations' pumpkin, not a player's painted one.
// A three-lobed jack-o'-lantern with a gap-toothed grin; Tabler's is an outline.
// The face is cut through, so the badge's candle shows, and inked on a tile.
export function PumpkinFilled() {
  return (
    <svg viewBox="2.2 2.4 19.6 18.6" fill="currentColor">
      <path
        className="tile-stem"
        d="M11 7C11 5.2 11.6 3.6 13 2.8 13.6 2.5 14.4 3 14.1 3.7 13.4 5 13.2 6 13.2 7Z"
      />
      <path
        fillRule="evenodd"
        d="M8.4 8C9.4 6.6 14.6 6.6 15.6 8 18.8 6.4 21.6 9 21.6 13.6 21.6 18 19 20.2 16 19.4 14.8 20.6 9.2 20.6 8 19.4 5 20.2 2.4 18 2.4 13.6 2.4 9 5.2 6.4 8.4 8ZM7.6 12.4 9.4 9.8 11 12.4ZM13 12.4 14.6 9.8 16.4 12.4ZM12 12.9 11.3 14H12.7ZM7 14.6Q8.2 15.1 9.6 15.3V16.6H10.9V15.45Q14.4 15.6 17 14.6 16.4 17 15.2 17.6V16.6H14V18.1Q13.2 18.6 12 18.6C9.8 18.6 8 17.6 7 14.6Z"
      />
      <path
        className="tile-carve"
        fillRule="evenodd"
        d="M7.6 12.4 9.4 9.8 11 12.4ZM13 12.4 14.6 9.8 16.4 12.4ZM12 12.9 11.3 14H12.7ZM7 14.6Q8.2 15.1 9.6 15.3V16.6H10.9V15.45Q14.4 15.6 17 14.6 16.4 17 15.2 17.6V16.6H14V18.1Q13.2 18.6 12 18.6C9.8 18.6 8 17.6 7 14.6Z"
      />
      <path
        className="tile-rib"
        d="M8.9 8.9Q9.4 8.2 10.2 7.9M13.8 7.9Q14.6 8.2 15.1 8.9M6.4 16.4Q6.9 18.1 7.8 19M17.6 16.4Q17.1 18.1 16.2 19"
      />
    </svg>
  );
}
/** A tile drawn as given, for the tile maker. */
export function AvatarTile({ tile }: { tile: Avatar }) {
  return (
    <span
      className="player-tile"
      aria-hidden="true"
      style={{ "--b": BACKS[tile.back] } as React.CSSProperties}
    >
      {/* A painted face is a static file the browser caches, so no path data
          sits in a page's HTML and a page fetches only the faces it shows. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/tiles/painted/${tile.face}.webp`}
        alt=""
        width={256}
        height={256}
      />
    </span>
  );
}

/** A player's sticker tile. Decorative: their name always sits beside it. */
export default function PlayerTile({ id }: { id: string }) {
  // -1 while hydrating, so the first client render matches the static HTML.
  const ready = useSyncExternalStore(subscribeTiles, tilesVersion, () => -1);
  return (
    <AvatarTile tile={parseTile(ready < 0 ? undefined : chosenTile(id), id)} />
  );
}

/** An open chair, marked with its wind so the table agrees which seat it is. */
export function EmptyTile({ glyph }: { glyph: string }) {
  return (
    <span className="player-tile" data-empty aria-hidden="true">
      {glyph}
    </span>
  );
}

/** The short name under a tile (see tileNames); screen readers hear it in full. */
export function TileName({ name, full }: { name: string; full: string }) {
  if (name === full) return full;
  return (
    <>
      <span aria-hidden="true">{name}</span>
      <span className="sr-only">{full}</span>
    </>
  );
}
