import AmbientDrift from "@/components/AmbientDrift";
import {
  CharacterFace,
  SuitFace,
  WhiteDragonFace,
} from "@/components/PlayingTile";
import TossedTile from "@/components/TossedTile";
import type { CSSProperties, ReactNode } from "react";

type Toss = {
  edge: "left" | "right";
  offset: string;
  top: string;
  size: number;
  turn: number;
  spin: number;
  drift: number;
  side: number;
  depth: number;
  faceDown?: boolean;
  index?: number;
  face?: ReactNode;
  phone?: boolean;
};

// Deliberately uneven, like tiles tipped out of a box.
const TILES: Toss[] = [
  {
    edge: "left",
    offset: "-40px",
    top: "8%",
    size: 1.1,
    turn: -18,
    spin: 14,
    drift: -140,
    side: 55,
    depth: 17,
    faceDown: true,
    phone: true,
  },
  {
    edge: "right",
    offset: "-50px",
    top: "5%",
    size: 1.25,
    turn: 14,
    spin: -12,
    drift: -90,
    side: 130,
    depth: 13,
    index: 6,
    face: <SuitFace suit="characters" rank={6} />,
    phone: true,
  },
  {
    edge: "left",
    offset: "-42px",
    top: "50%",
    size: 0.85,
    turn: 11,
    spin: -16,
    drift: -170,
    side: 300,
    depth: 11,
    face: <CharacterFace bottom="中" />,
  },
  {
    edge: "right",
    offset: "-52px",
    top: "40%",
    size: 1.05,
    turn: -22,
    spin: 18,
    drift: -120,
    side: 220,
    depth: 18,
    index: 1,
    face: <SuitFace suit="bamboo" rank={1} />,
  },
  {
    edge: "right",
    offset: "-30px",
    top: "80%",
    size: 0.9,
    turn: 33,
    spin: -10,
    drift: -200,
    side: 80,
    depth: 20,
    faceDown: true,
  },
  {
    edge: "left",
    offset: "-56px",
    top: "84%",
    size: 1.2,
    turn: -9,
    spin: 12,
    drift: -150,
    side: 160,
    depth: 14,
    index: 5,
    face: <SuitFace suit="dots" rank={5} />,
  },
  {
    edge: "right",
    offset: "-36px",
    top: "62%",
    size: 0.75,
    turn: 8,
    spin: 22,
    drift: -240,
    side: 20,
    depth: 12,
    face: <WhiteDragonFace />,
  },
];

/** Tiles tossed round the page edges, drifting as the reader scrolls. */
export default function AmbientTiles() {
  return (
    <div className="ambient-tiles" aria-hidden="true">
      {TILES.map((tile, i) => {
        const style = {
          [tile.edge]: "var(--offset)",
          top: "var(--top)",
          "--offset": tile.offset,
          "--top": tile.top,
          "--turn": `${tile.turn}deg`,
          "--spin": `${tile.spin}deg`,
          "--drift": `${tile.drift}px`,
          "--size": tile.size,
        } as CSSProperties;
        return (
          <div
            key={i}
            className={tile.phone ? "ambient-tile is-phone" : "ambient-tile"}
            style={style}
          >
            <TossedTile
              side={tile.side}
              depth={tile.depth}
              faceDown={tile.faceDown}
              index={tile.index}
            >
              {tile.face}
            </TossedTile>
          </div>
        );
      })}
      <AmbientDrift />
    </div>
  );
}
