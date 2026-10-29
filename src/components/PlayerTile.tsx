"use client";

import { useSyncExternalStore } from "react";
import {
  IconCloudFilled,
  IconCloverFilled,
  IconHeartFilled,
  IconMoonFilled,
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
        className="tile-crease tile-rib"
        d="M8.9 8.9Q9.4 8.2 10.2 7.9M13.8 7.9Q14.6 8.2 15.1 8.9M6.4 16.4Q6.9 18.1 7.8 19M17.6 16.4Q17.1 18.1 16.2 19"
      />
    </svg>
  );
}
// A sheet ghost waving both arms, with an open smile.
function GhostFilled() {
  return (
    <svg viewBox="2.4 2.6 19.2 18.8" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M6 9A6 6 0 0 1 18 9V11.6C19.5 11.2 20.9 11.9 21.3 13 20 13 18.9 13.6 18.2 14.4L18.4 18.6C18.5 20 17.4 20.6 16.2 19.8 15 19 14 19.4 13.4 20.2 12.8 21 11.2 21 10.6 20.2 10 19.4 9 19 7.8 19.8 6.6 20.6 5.5 20 5.6 18.6L5.8 14.4C5.1 13.6 4 13 2.7 13 3.1 11.9 4.5 11.2 6 11.6ZM9.1 9.8A1 1.35 0 1 0 11.1 9.8 1 1.35 0 1 0 9.1 9.8ZM12.9 9.8A1 1.35 0 1 0 14.9 9.8 1 1.35 0 1 0 12.9 9.8ZM10.7 12.2H13.3C13.2 13.9 10.8 13.9 10.7 12.2Z"
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
// A banana, thick in the middle, curving from a green stem down to a brown
// tip, with a ridge along its back.
function BananaFilled() {
  return (
    <svg viewBox="3.8 2.8 17 18.6" fill="currentColor">
      <path d="M16.2 6.8C17 6 18.4 6 18.9 6.9 21.6 12.2 18.4 20.6 9 20.9 7 21 5.2 20.4 4.3 19.4 4 19 4.2 18.4 4.8 18.2 11.6 16.4 15.8 12.6 16.2 6.8z" />
      <path className="tile-crease" d="M18.4 8C19.8 13 16.6 18.6 9.6 19.6" />
      <path
        fill="oklch(0.6 0.14 135)"
        d="M16.6 7 16.9 3.8C17 3.2 18.2 3.2 18.3 3.8L18.6 7z"
      />
      <circle cx="4.6" cy="18.9" r="0.7" fill={STEM} />
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
// A paw with its four toes evenly spaced round the pad; Tabler's crowd in.
function PawFilled() {
  return (
    <svg viewBox="3.2 3.8 17.6 17" fill="currentColor">
      <path d="M12 11C14.6 11 17.6 14.4 17.6 17.2 17.6 19.4 16 20.4 14.4 20 13.4 19.8 12.8 19.4 12 19.4S10.6 19.8 9.6 20C8 20.4 6.4 19.4 6.4 17.2 6.4 14.4 9.4 11 12 11Z" />
      <ellipse cx="9.4" cy="6.9" rx="2" ry="2.6" />
      <ellipse cx="14.6" cy="6.9" rx="2" ry="2.6" />
      <ellipse
        cx="5.5"
        cy="11.2"
        rx="1.9"
        ry="2.4"
        transform="rotate(-25 5.5 11.2)"
      />
      <ellipse
        cx="18.5"
        cy="11.2"
        rx="1.9"
        ry="2.4"
        transform="rotate(25 18.5 11.2)"
      />
    </svg>
  );
}
// Halloween's bat (with ears), witch's hat (floppy tip, buckled band) and
// skull (round eyes, rounded teeth), drawn as the pumpkin is.
const ORANGE = "oklch(0.58 0.175 42)";
const GOLD = "oklch(0.8 0.14 85)";
function BatFilled() {
  return (
    <svg viewBox="1.2 5.2 21.6 13.2" fill="currentColor">
      <path d="M10.2 8.6 10.5 5.6 11.4 7.5H12.6L13.5 5.6 13.8 8.6C16 7.4 20 7.2 22.6 8.8Q20.6 10.4 19.8 12.6 18 11.4 16.6 13.4 14.4 13 13.4 16.2Q12.8 17.8 12 18.2 11.2 17.8 10.6 16.2 9.6 13 7.4 13.4 6 11.4 4.2 12.6 3.4 10.4 1.4 8.8C4 7.2 8 7.4 10.2 8.6Z" />
    </svg>
  );
}
function HatFilled() {
  return (
    <svg viewBox="2 2.2 20 18" fill="currentColor">
      <path d="M7.4 16.2C8.6 12.4 9.6 9.6 10.4 7.4 11 5.6 12 4 13.8 3.6 15.2 3.3 16.6 4 17.4 5.6 16.1 4.9 14.8 5.3 14.4 6.6 14 8.4 15.6 12.6 16.6 16.2Z" />
      <path d="M2.2 17.4C3.2 16 6.6 15.4 12 15.4S20.8 16 21.8 17.4C21 19.2 17.2 20 12 20S3 19.2 2.2 17.4Z" />
      <path
        fill={ORANGE}
        d="M8.1 13.6C10.6 14.2 13.4 14.2 15.9 13.6L16.5 15.8C13.6 16.4 10.4 16.4 7.5 15.8Z"
      />
      <rect x="10.6" y="13.5" width="2.8" height="2.8" rx="0.7" fill={GOLD} />
      <rect
        x="11.35"
        y="14.25"
        width="1.3"
        height="1.3"
        rx="0.35"
        fill={ORANGE}
      />
    </svg>
  );
}
function SkullFilled() {
  return (
    <svg viewBox="4 2 16 19" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.4 16.7A7.6 7.6 0 1 1 15.6 16.7V19.6A.9.9 0 0 1 13.8 19.6.9.9 0 0 1 12 19.6.9.9 0 0 1 10.2 19.6.9.9 0 0 1 8.4 19.6ZM7.2 11.3A2.1 2.1 0 1 0 11.4 11.3 2.1 2.1 0 1 0 7.2 11.3ZM12.6 11.3A2.1 2.1 0 1 0 16.8 11.3 2.1 2.1 0 1 0 12.6 11.3ZM12 14C12.4 14 13.1 15.1 13 15.4 12.9 15.7 11.1 15.7 11 15.4 10.9 15.1 11.6 14 12 14Z"
      />
      <path
        className="tile-crease"
        d="M10.2 18.2V19.6M12 18.2V19.6M13.8 18.2V19.6"
      />
    </svg>
  );
}
// Tabler draws on a 24px grid with uneven margins; each crop is that icon's
// own ink, so the stylesheet can fit every picture to a wind character's box.
const PICTURES: Record<
  Exclude<Face, keyof typeof CHARACTERS>,
  React.ReactNode
> = {
  paw: <PawFilled />,
  star: <IconStarFilled viewBox="0.6 0.6 22.8 21.8" />,
  heart: <IconHeartFilled viewBox="1.6 2.6 20.8 18.8" />,
  moon: <IconMoonFilled viewBox="1.6 1.6 20.1 20.8" />,
  sun: <IconSunFilled viewBox="1.6 1.6 20.8 20.8" />,
  flower: <SakuraFilled />,
  clover: <IconCloverFilled viewBox="1.6 1.6 20.8 20.8" />,
  banana: <BananaFilled />,
  crown: (
    <svg viewBox="1.6 4.5 20.7 14.9" fill="currentColor">
      <path d="M19 19h-14c-.5 0 -.9 -.3 -1 -.8l-2 -10c0 -.4 .1 -.8 .5 -1.1c.4 -.2 .8 -.2 1.1 0l4.1 3.3l3.4 -5.1c.4 -.6 1.3 -.6 1.7 0l3.4 5.1l4.1 -3.3c.3 -.3 .8 -.3 1.1 0c.4 .2 .5 .6 .5 1.1l-2 10c0 .5 -.5 .8 -1 .8z" />
    </svg>
  ),
  cloud: <IconCloudFilled viewBox="0.6 3.6 22.8 15.8" />,
  apple: <AppleFilled />,
  peach: <PeachFilled />,
  mandarin: <MandarinFilled />,
  coin: <CoinFilled />,
  sprout: <IconSeedlingFilled viewBox="1.6 2.6 20.8 18.8" />,
  pumpkin: <PumpkinFilled />,
  ghost: <GhostFilled />,
  spider: <IconSpiderFilled viewBox="1.1 2.6 21.8 17.8" />,
  bat: <BatFilled />,
  hat: <HatFilled />,
  skull: <SkullFilled />,
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
