"use client";

import { useSyncExternalStore } from "react";
import {
  IconAppleFilled,
  IconCherryFilled,
  IconCloudFilled,
  IconCloverFilled,
  IconCrownFilled,
  IconFlowerFilled,
  IconGhost2Filled,
  IconHeartFilled,
  IconMoonFilled,
  IconPawFilled,
  IconSeedlingFilled,
  IconSpiderFilled,
  IconStarFilled,
  IconSunFilled,
} from "@tabler/icons-react";
import {
  BACKS,
  CHARACTERS,
  INKS,
  RIMS,
  parseTile,
  type Avatar,
  type Face,
} from "@/lib/avatar";
import { chosenTile, subscribeTiles, tilesVersion } from "@/lib/tiles";

// The square-holed coin the dots suit is drawn from; Tabler has none.
function CoinFilled() {
  return (
    <svg viewBox="1.6 1.6 20.8 20.8" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 1 0 20a10 10 0 0 1 0 -20zm0 2.2a7.8 7.8 0 1 0 0 15.6a7.8 7.8 0 0 0 0 -15.6zm0 1.3a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0 -13zm-2.6 3.9v5.2h5.2v-5.2z"
      />
    </svg>
  );
}
// A jack-o'-lantern; Tabler's pumpkin is an outline.
export function PumpkinFilled() {
  return (
    <svg viewBox="2.4 2.2 19.2 18.6" fill="currentColor">
      <path d="M11.3 7.4c-.1-2.2.7-3.9 2.6-4.8l.9 1.4c-1.2.6-1.7 1.8-1.6 3.4z" />
      <path
        fillRule="evenodd"
        d="M12 7.6c-1.2-.9-2.9-1.2-4.4-.8C4.6 7.6 2.8 10.4 2.8 13.8c0 3.6 2.4 6.6 5.6 6.6 1.4 0 2.6-.5 3.6-1.3 1 .8 2.2 1.3 3.6 1.3 3.2 0 5.6-3 5.6-6.6 0-3.4-1.8-6.2-4.8-7-1.5-.4-3.2-.1-4.4.8zM7 13.4l1.8-2.6 1.8 2.6zm6.4 0l1.8-2.6 1.8 2.6zM7.2 15.4h9.6l-1.3 2.3-1.6-.9-1.9 1-1.9-1-1.6.9z"
      />
    </svg>
  );
}
// A peach, for long life, with its cleft cut through.
function PeachFilled() {
  return (
    <svg viewBox="2.8 2.8 18.4 19.1" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12 7.2c-4.4-1.6-8.8 1.4-8.8 6.2 0 4.7 3.9 8.1 8.8 8.1s8.8-3.4 8.8-8.1c0-4.8-4.4-7.8-8.8-6.2zm-.7 1.3c-1.5 2.8-1.7 6.3-.3 10l1.5-.6c-1.2-3.2-1-6.3.2-8.6z"
      />
      <path d="M12.4 6.6c.9-2.6 3.3-3.8 6-3.3-.7 2.6-3.2 3.8-6 3.3z" />
    </svg>
  );
}
// A mandarin, for luck at New Year.
function MandarinFilled() {
  return (
    <svg viewBox="4.2 2 15.6 20.4" fill="currentColor">
      <circle cx="12" cy="14.6" r="7.4" />
      <path d="M12.6 6.3c.6-2.6 2.7-4 5.6-3.9-.4 2.8-2.5 4.3-5.6 3.9z" />
    </svg>
  );
}
// Tabler draws on a 24px grid with uneven margins; each crop is that icon's
// own ink, so the stylesheet can fit every picture to a wind character's box.
const PICTURES: Record<
  Exclude<Face, keyof typeof CHARACTERS>,
  React.ReactNode
> = {
  paw: <IconPawFilled viewBox="1.6 2.6 20.8 18.8" />,
  star: <IconStarFilled viewBox="0.6 0.6 22.8 21.8" />,
  heart: <IconHeartFilled viewBox="1.6 2.6 20.8 18.8" />,
  moon: <IconMoonFilled viewBox="1.6 1.6 20.1 20.8" />,
  sun: <IconSunFilled viewBox="1.6 1.6 20.8 20.8" />,
  flower: <IconFlowerFilled viewBox="1.6 0.6 20.8 22.8" />,
  clover: <IconCloverFilled viewBox="1.6 1.6 20.8 20.8" />,
  cherry: <IconCherryFilled viewBox="2.6 2.6 18.8 19.8" />,
  crown: <IconCrownFilled viewBox="1.6 4.5 20.7 14.9" />,
  cloud: <IconCloudFilled viewBox="0.6 3.6 22.8 15.8" />,
  apple: <IconAppleFilled viewBox="2.6 1.6 18.8 20.8" />,
  peach: <PeachFilled />,
  mandarin: <MandarinFilled />,
  coin: <CoinFilled />,
  sprout: <IconSeedlingFilled viewBox="1.6 2.6 20.8 18.8" />,
  pumpkin: <PumpkinFilled />,
  ghost: <IconGhost2Filled viewBox="0.6 1.6 22.8 20.8" />,
  spider: <IconSpiderFilled viewBox="1.1 2.6 21.8 17.8" />,
};

/** A tile drawn as given, for the tile maker. */
export function AvatarTile({ tile }: { tile: Avatar }) {
  return (
    <span
      className="player-tile"
      data-face={tile.face}
      aria-hidden="true"
      style={
        {
          "--g": INKS[tile.face],
          "--rim": RIMS[tile.face],
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
