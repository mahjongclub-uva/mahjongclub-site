import type { CSSProperties } from "react";

const WORD = "MAHJONG";

/**
 * The club name as mahjong tiles.
 *
 * Three things about this markup are load-bearing, so change them carefully:
 *
 * 1. The letters are real characters in the DOM. Not images, not
 *    pseudo-content. This is the string that most needs to be selectable,
 *    indexable and readable by a screen reader — a recruitment page whose own
 *    name is invisible to search has failed at its main job.
 *
 * 2. The <h1> carries an aria-label, because the word is split across seven
 *    elements and a screen reader would otherwise announce seven letters
 *    instead of a word.
 *
 * 3. Each tile carries its index as a --i custom property. The stagger is
 *    calc(var(--i) * step) in CSS, so the timing is data on the element
 *    rather than seven nearly identical rules — and no JavaScript.
 *
 * The face-up state is the DEFAULT. The animation starts the tiles face down
 * using animation-fill-mode: backwards, which means if CSS fails, or the
 * visitor prefers reduced motion, the name is simply legible with no
 * animation at all. Never invert this: build the readable state first and let
 * motion be the thing that opts in.
 */
export default function Wordmark() {
  return (
    <h1 className="wordmark" aria-label="Mahjong Club at UVA">
      <span className="wordmark-tiles">
        {WORD.split("").map((letter, i) => (
          <span
            className="tile"
            key={i}
            style={{ "--i": i } as CSSProperties}
          >
            {/* The back of the tile. Decorative — the letter lives on the face. */}
            <span className="tile-back" aria-hidden="true" />
            <span className="tile-face">{letter}</span>
          </span>
        ))}
      </span>
      <span className="wordmark-sub">Club at UVA</span>
    </h1>
  );
}
