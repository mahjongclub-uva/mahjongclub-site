import { Bamboo, Dots } from "@/components/TileArtwork";
import type { ReactNode } from "react";

const NUMERALS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export type Suit = "bamboo" | "dots" | "characters";

/** One illustrated face, shared by the tile reference and example hand. */
export function Tile({
  name,
  rank,
  children,
}: {
  name: string;
  rank?: number;
  children: ReactNode;
}) {
  return (
    <li className="set-tile">
      <span className="set-tile-body">
        <svg
          viewBox="0 0 88 124"
          className="guide-tile"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M9 3 H72 L85 16 V116 Q85 123 77 123 H16 L3 110 V10 Q3 3 9 3"
            fill="#a9d2c3"
          />
          <rect
            x="2"
            y="2"
            width="75"
            height="113"
            rx="7"
            fill="#f4f2e9"
            stroke="#a9d2c3"
            strokeWidth="2"
          />
          <g transform="translate(-1 3) scale(.91 .91)">{children}</g>
          {rank && (
            <text
              x="7"
              y="15"
              fontFamily="sans-serif"
              fontWeight="600"
              fontSize="11"
              fill="#236951"
            >
              {rank}
            </text>
          )}
        </svg>
      </span>
      <span className="sr-only">{name}</span>
    </li>
  );
}

export function CharacterTile({
  name,
  top,
  bottom,
  rank,
  ink = "#c94219",
}: {
  name: string;
  top?: string;
  bottom: string;
  rank?: number;
  ink?: string;
}) {
  return (
    <Tile name={name} rank={rank}>
      {top && (
        <text className="set-ink-numeral" x="44" y="49" textAnchor="middle">
          {top}
        </text>
      )}
      <text
        className="set-ink-suit"
        x="44"
        y={top ? 94 : 76}
        textAnchor="middle"
        fontSize={top ? 34 : 52}
        style={{ fill: ink }}
      >
        {bottom}
      </text>
    </Tile>
  );
}

export default function PlayingTile({
  suit,
  rank,
}: {
  suit: Suit;
  rank: number;
}) {
  const name = `${rank} of ${suit}`;
  if (suit === "characters")
    return (
      <CharacterTile name={name} rank={rank} top={NUMERALS[rank]} bottom="萬" />
    );
  return (
    <Tile name={name} rank={rank}>
      {suit === "dots" ? <Dots count={rank} /> : <Bamboo count={rank} />}
    </Tile>
  );
}
