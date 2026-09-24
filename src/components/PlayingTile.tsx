import { Bamboo, Dots, BLUE, GREEN, RED } from "@/components/TileArtwork";
import { GLYPHS } from "@/components/glyphs";
import { Traced } from "@/components/TracedArt";
import type { ReactNode } from "react";

const NUMERALS = ["", "一", "二", "三", "四", "伍", "六", "七", "八", "九"];
export type Suit = "bamboo" | "dots" | "characters";

/**
 * One illustrated tile, shared by the tile reference and example hand. The
 * face is its own 88 x 124 box, so artwork is drawn at full size; the
 * celadon edge hangs off its right and bottom.
 */
export function Tile({
  name,
  index,
  indexColour = GREEN,
  children,
}: {
  name: string;
  /** Corner mark: a number, or a wind's letter, for readers new to the glyphs. */
  index?: string | number;
  indexColour?: string;
  children: ReactNode;
}) {
  return (
    <li className="set-tile">
      <span className="set-tile-body">
        <svg
          viewBox="0 0 98 135"
          className="guide-tile"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M8 1 H80 L97 18 V127 Q97 134 90 134 H18 L1 117 V8 Q1 1 8 1 Z"
            fill="var(--tile-side)"
          />
          <path
            d="M8 1 H80 L97 18 V127 Q97 134 90 134 H18 L1 117 V8 Q1 1 8 1 Z"
            fill="url(#tileHalftone)"
          />
          <rect
            x="1"
            y="1"
            width="86"
            height="122"
            rx="8"
            fill="var(--tile-face)"
            stroke="var(--tile-side)"
            strokeWidth="2"
          />
          <g className="tile-ink">{children}</g>
          {index !== undefined && (
            <text
              x="6"
              y="18"
              fontFamily="var(--sans), sans-serif"
              fontWeight="700"
              fontSize="15"
              fill={indexColour}
            >
              {index}
            </text>
          )}
        </svg>
      </span>
      <span className="sr-only">{name}</span>
    </li>
  );
}

/**
 * One brush character, baked to a path (see pipeline/bake_glyphs.py), centred
 * on (x, y) at size s. A stroke in the same ink thickens the brush a little,
 * because printed tiles carry heavier lettering than the typeface.
 */
export function Glyph({
  char,
  x,
  y,
  size,
  fill,
}: {
  char: string;
  x: number;
  y: number;
  size: number;
  fill: string;
}) {
  return (
    <path
      d={GLYPHS[char]}
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 1000})`}
      fill={fill}
      stroke={fill}
      strokeWidth="8"
      strokeLinejoin="round"
    />
  );
}

/** A character face: an optional numeral over a large character. */
export function CharacterFace({
  top,
  bottom,
  ink = RED,
}: {
  top?: string;
  bottom: string;
  ink?: string;
}) {
  return (
    <>
      {top && <Glyph char={top} x={45} y={40} size={42} fill={BLUE} />}
      {top ? (
        <Glyph char={bottom} x={44} y={88} size={48} fill={ink} />
      ) : (
        <Glyph char={bottom} x={44} y={64} size={62} fill={ink} />
      )}
    </>
  );
}

export function CharacterTile({
  name,
  top,
  bottom,
  index,
  indexColour,
  ink,
}: {
  name: string;
  top?: string;
  bottom: string;
  index?: string | number;
  indexColour?: string;
  ink?: string;
}) {
  return (
    <Tile name={name} index={index} indexColour={indexColour}>
      <CharacterFace top={top} bottom={bottom} ink={ink} />
    </Tile>
  );
}

/** The white dragon: a blue frame with notched corners, like a ticket. */
export function WhiteDragonFace() {
  return (
    <g fill="none" stroke={BLUE}>
      <path
        strokeWidth="5"
        d="M26 22 H62 Q62 28 68 28 V96 Q62 96 62 102 H26 Q26 96 20 96 V28 Q26 28 26 22 Z"
      />
      <rect x="29" y="33" width="30" height="58" rx="2" strokeWidth="2" />
    </g>
  );
}

/** Any suit tile's face, without the tile around it. */
export function SuitFace({ suit, rank }: { suit: Suit; rank: number }) {
  if (suit === "characters")
    return <CharacterFace top={NUMERALS[rank]} bottom="萬" />;
  if (suit === "dots") return <Dots count={rank} />;
  return rank === 1 ? <Traced face="bird" /> : <Bamboo count={rank} />;
}

export default function PlayingTile({
  suit,
  rank,
}: {
  suit: Suit;
  rank: number;
}) {
  return (
    <Tile name={`${rank} of ${suit}`} index={rank}>
      <SuitFace suit={suit} rank={rank} />
    </Tile>
  );
}
