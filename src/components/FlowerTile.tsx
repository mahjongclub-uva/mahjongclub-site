import { Glyph, Tile } from "@/components/PlayingTile";
import { BLUE, RED } from "@/components/TileArtwork";
import { Traced } from "@/components/TracedArt";

const FLOWERS = [
  { name: "Plum blossom", character: "梅" },
  { name: "Orchid", character: "蘭" },
  { name: "Chrysanthemum", character: "菊" },
  { name: "Bamboo", character: "竹" },
];
const SEASONS = [
  { name: "Spring", character: "春" },
  { name: "Summer", character: "夏" },
  { name: "Autumn", character: "秋" },
  { name: "Winter", character: "冬" },
];

/** A bonus tile's number, sitting level with its name as on the club's set. */
function CornerNumber({
  x,
  rank,
  fill,
}: {
  x: number;
  rank: number;
  fill: string;
}) {
  return (
    <text
      x={x}
      y="34"
      textAnchor="middle"
      fontFamily="var(--sans), sans-serif"
      fontWeight="700"
      fontSize="18"
      fill={fill}
    >
      {rank}
    </text>
  );
}

/**
 * Bonus tiles: the plant is traced from the club's own set, the corners are
 * drawn in brush glyphs, laid out as that set does. Flowers carry a blue name
 * top-left and number top-right.
 */
export default function FlowerTile({ rank }: { rank: 1 | 2 | 3 | 4 }) {
  const { name, character } = FLOWERS[rank - 1];
  return (
    <Tile name={`${name} flower tile, ${rank}`}>
      <Traced face={`flower${rank}`} />
      <Glyph char={character} x={20} y={27} size={20} fill={BLUE} />
      <CornerNumber x={72} rank={rank} fill={BLUE} />
    </Tile>
  );
}

/** Seasons: a red number top-left and a red name top-right. */
export function SeasonTile({ rank }: { rank: 1 | 2 | 3 | 4 }) {
  const { name, character } = SEASONS[rank - 1];
  return (
    <Tile name={`${name} season tile, ${rank}`}>
      <Traced face={`season${rank}`} />
      <CornerNumber x={16} rank={rank} fill={RED} />
      <Glyph char={character} x={66} y={27} size={20} fill={RED} />
    </Tile>
  );
}
