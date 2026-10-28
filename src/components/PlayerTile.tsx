"use client";

import { useSyncExternalStore } from "react";
import {
  IconCherryFilled,
  IconCloudFilled,
  IconCloverFilled,
  IconCrownFilled,
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
// Leaves and stems keep their own colour on any face; the fruit takes the ink.
const LEAF = "oklch(0.56 0.14 140)";
const STEM = "oklch(0.42 0.07 55)";
const VEIN = "oklch(0.42 0.11 145)";
// A peach, for long life: a rounded heart with broad shoulders, dipped where
// the stem grows and softly pointed at the foot, its crease sweeping down so
// the near cheek is the larger, and one leaf beside the stem.
function PeachFilled() {
  return (
    <svg viewBox="3 2.6 18 19.2" fill="currentColor">
      <path d="M12.6 8.4C15 6.6 20.6 7.4 20.6 12.8 20.6 17 16.2 20.2 12.6 21.3 12.2 21.4 11.8 21.4 11.4 21.3 7.8 20.2 3.4 17 3.4 12.8 3.4 7.4 9.8 6.4 12.6 8.4z" />
      <path className="tile-crease" d="M12.9 8.8C16 9.8 17.2 14.2 15.8 17.6" />
      <path
        fill="none"
        stroke={VEIN}
        strokeWidth="0.95"
        strokeLinecap="round"
        d="M12.6 8.2C12.6 6.6 12.3 5.3 11.6 4.2"
      />
      <path
        fill={LEAF}
        d="M12.6 5.8C13.8 3.6 16.8 2.7 19.6 3.4 18.6 5.9 15.7 6.9 12.6 5.8z"
      />
    </svg>
  );
}
// An apple with a stem and a leaf; Tabler's reads as a tomato.
function AppleFilled() {
  return (
    <svg viewBox="2.8 2.4 18.4 19.6" fill="currentColor">
      <path d="M12 7.6c-1.4-1-3.4-1.4-5.2-.8-2.6 1-3.8 3.6-3.6 6.6.3 4.2 3.2 8.2 6.2 8.2 1 0 1.6-.5 2.6-.5s1.6.5 2.6.5c3 0 5.9-4 6.2-8.2.2-3-1-5.6-3.6-6.6-1.8-.6-3.8-.2-5.2.8z" />
      <path
        fill={STEM}
        d="M11.4 7.6c0-1.9.4-3.4 1.3-4.8l1 .6c-.8 1.3-1.1 2.6-1.1 4.2z"
      />
      <path
        fill={LEAF}
        d="M13.2 5.6c.8-2 3-3 5.2-2.6-.7 2.1-2.8 3.2-5.2 2.6z"
      />
    </svg>
  );
}
// A mandarin, for luck at New Year: squat, with a dimple, a stem and a
// veined leaf.
function MandarinFilled() {
  return (
    <svg viewBox="3.6 3 16.8 18" fill="currentColor">
      <ellipse cx="12" cy="14" rx="8" ry="6.8" />
      <path className="tile-crease" d="M10.4 7.8q1.6 .9 3.2 0" />
      <path
        fill={STEM}
        d="M11.5 7.6c0-1.1.2-1.9.7-2.6l.9.5c-.4.6-.5 1.2-.5 2.1z"
      />
      <path
        fill={LEAF}
        d="M12.6 6c1.2-2.4 3.8-3.4 6.4-2.6-1.2 2.4-3.8 3.2-6.4 2.6z"
      />
      <path
        fill="none"
        stroke={VEIN}
        strokeWidth="0.7"
        strokeLinecap="round"
        d="M13.2 5.7c1.8-.5 3.5-1.1 5.2-2"
      />
    </svg>
  );
}
// A cherry blossom: five notched petals round a deeper centre.
const PETAL =
  "M12 12C9.6 9.6 9.4 5.8 10.9 3.8L12 5l1.1-1.2c1.5 2 1.3 5.8-1.1 8.2z";
function SakuraFilled() {
  return (
    <svg viewBox="3.6 3.4 16.8 16.4" fill="currentColor">
      {[0, 72, 144, 216, 288].map((turn) => (
        <path key={turn} d={PETAL} transform={`rotate(${turn} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.7" fill="oklch(0.62 0.16 0)" />
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
  flower: <SakuraFilled />,
  clover: <IconCloverFilled viewBox="1.6 1.6 20.8 20.8" />,
  cherry: <IconCherryFilled viewBox="2.6 2.6 18.8 19.8" />,
  crown: <IconCrownFilled viewBox="1.6 4.5 20.7 14.9" />,
  cloud: <IconCloudFilled viewBox="0.6 3.6 22.8 15.8" />,
  apple: <AppleFilled />,
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
