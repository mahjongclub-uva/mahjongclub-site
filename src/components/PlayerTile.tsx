"use client";

import { useSyncExternalStore } from "react";
import {
  IconAppleFilled,
  IconButterfly,
  IconCloudFilled,
  IconCloverFilled,
  IconFlameFilled,
  IconFlowerFilled,
  IconHeartFilled,
  IconMoonFilled,
  IconPawFilled,
  IconSeedlingFilled,
  IconStarFilled,
  IconSunFilled,
} from "@tabler/icons-react";
import {
  BACKS,
  CHARACTERS,
  INKS,
  parseTile,
  type Avatar,
  type Face,
} from "@/lib/avatar";
import { chosenTile, subscribeTiles, tilesVersion } from "@/lib/tiles";

// The square-holed coin the dots suit is drawn from; Tabler has none.
function CoinFilled() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 1 0 20a10 10 0 0 1 0 -20zm0 2.2a7.8 7.8 0 1 0 0 15.6a7.8 7.8 0 0 0 0 -15.6zm0 1.3a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0 -13zm-2.6 3.9v5.2h5.2v-5.2z"
      />
    </svg>
  );
}
const PICTURES: Record<
  Exclude<Face, keyof typeof CHARACTERS>,
  React.ReactNode
> = {
  paw: <IconPawFilled />,
  star: <IconStarFilled />,
  heart: <IconHeartFilled />,
  moon: <IconMoonFilled />,
  sun: <IconSunFilled />,
  flower: <IconFlowerFilled />,
  clover: <IconCloverFilled />,
  // The filled butterfly has no body, so this one is the outline.
  butterfly: <IconButterfly stroke={2.25} />,
  flame: <IconFlameFilled />,
  cloud: <IconCloudFilled />,
  apple: <IconAppleFilled />,
  coin: <CoinFilled />,
  sprout: <IconSeedlingFilled />,
};

/** A tile drawn as given, for the tile maker. */
export function TileFace({ tile }: { tile: Avatar }) {
  return (
    <span
      className="player-tile"
      aria-hidden="true"
      style={
        {
          "--g": INKS[tile.ink],
          "--b": BACKS[tile.back],
        } as React.CSSProperties
      }
    >
      {tile.face in CHARACTERS
        ? CHARACTERS[tile.face as keyof typeof CHARACTERS]
        : PICTURES[tile.face as keyof typeof PICTURES]}
    </span>
  );
}

/** A player's sticker tile. Decorative: their name always sits beside it. */
export default function PlayerTile({ id }: { id: string }) {
  // -1 while hydrating, so the first client render matches the static HTML.
  const ready = useSyncExternalStore(subscribeTiles, tilesVersion, () => -1);
  return (
    <TileFace tile={parseTile(ready < 0 ? undefined : chosenTile(id), id)} />
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
