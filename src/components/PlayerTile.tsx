import { BACKS, INKS, starterAvatar } from "@/lib/avatar";

/** A player's sticker tile. Decorative: their name always sits beside it. */
export default function PlayerTile({ id }: { id: string }) {
  const tile = starterAvatar(id);
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
      {tile.glyph}
    </span>
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
