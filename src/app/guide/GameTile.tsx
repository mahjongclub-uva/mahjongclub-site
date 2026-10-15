import {
  CharacterFace,
  SuitFace,
  TileFace,
  WhiteDragonFace,
} from "@/components/PlayingTile";
import { BLUE, GREEN } from "@/components/TileArtwork";
import { FlowerFace, SeasonFace } from "@/components/FlowerTile";
import type { Piece } from "@/lib/guide-practice";

/** Any game tile's face: suits, and the bonus tiles set aside. */
export default function GameTile({ piece }: { piece: Piece }) {
  const { suit, rank } = piece;
  if (suit === "wind")
    return (
      <TileFace index={"ESWN"[rank - 1]}>
        <CharacterFace bottom={"東南西北"[rank - 1]} ink={BLUE} />
      </TileFace>
    );
  if (suit === "dragon")
    return (
      <TileFace>
        {rank === 3 ? (
          <WhiteDragonFace />
        ) : (
          <CharacterFace
            bottom={rank === 1 ? "中" : "發"}
            ink={rank === 1 ? undefined : GREEN}
          />
        )}
      </TileFace>
    );
  if (suit === "flower" || suit === "season")
    return (
      <TileFace>
        {suit === "flower" ? (
          <FlowerFace rank={rank} />
        ) : (
          <SeasonFace rank={rank} />
        )}
      </TileFace>
    );
  return (
    <TileFace index={rank}>
      <SuitFace suit={suit} rank={rank} />
    </TileFace>
  );
}
