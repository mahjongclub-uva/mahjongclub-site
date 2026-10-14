import { pieceName, type Piece } from "@/lib/guide-practice";
import GameTile from "./GameTile";
import styles from "./games.module.css";

/** The tiles you may throw, large enough to tap; a fresh draw is marked New. */
export default function ThrowRow({
  tiles,
  fresh,
  onThrow,
}: {
  tiles: Piece[];
  fresh?: number;
  onThrow: (index: number) => void;
}) {
  return (
    <ul className={styles.throwRow} aria-label="Tiles you can throw">
      {tiles.map((piece, i) => (
        <li key={i}>
          <button
            type="button"
            className={styles.throwTile}
            aria-label={`Throw ${pieceName(piece)}${i === fresh ? ", just drawn" : ""}`}
            onClick={() => onThrow(i)}
          >
            <GameTile piece={piece} />
            {i === fresh && <span className={styles.fresh}>New</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
