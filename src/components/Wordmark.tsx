import type { CSSProperties } from "react";

const WORD = "MAHJONG";

/**
 * The club name as mahjong tiles, revealed in three beats: the tiles rise and
 * settle, then flip in a cascade, then the subtitle fades in.
 *
 * Three things about this markup are load-bearing:
 *
 * 1. The letters are real characters in the DOM. Not images, not
 *    pseudo-content. This is the string that most needs to be selectable,
 *    indexable and readable by a screen reader.
 *
 * 2. The <h1> carries an aria-label, because the word is split across seven
 *    elements and a screen reader would otherwise announce seven letters.
 *
 * 3. Each tile carries its index as --i. Both the rise and the flip derive
 *    their delay from it in CSS, so the whole sequence needs no JavaScript.
 *
 * The nesting is two levels for a reason: .tile-scene moves and fades, .tile
 * rotates. Combining them on one element would mean one transform property
 * fighting over two animations.
 *
 * The resolved state — tiles up, faces showing, subtitle visible — is the
 * DEFAULT. The animation starts them hidden using animation-fill-mode:
 * backwards. So if CSS fails, or the visitor prefers reduced motion, the name
 * is simply legible with no animation. Never invert this: the club's name must
 * not depend on a bundle loading or an animation completing.
 */
export default function Wordmark() {
  return (
    <h1 className="wordmark" aria-label="Mahjong Club at the University of Virginia">
      <span className="wordmark-tiles">
        {WORD.split("").map((letter, i) => (
          <span className="tile-scene" key={i} style={{ "--i": i } as CSSProperties}>
            <span className="tile">
              {/* Decorative: the letter lives on the face. */}
              <span className="tile-back" aria-hidden="true" />
              <span className="tile-face">{letter}</span>
            </span>
          </span>
        ))}
      </span>

      <span className="wordmark-sub">
        <span className="wordmark-club">Club</span>
        <span className="wordmark-uni">University of Virginia</span>
      </span>
    </h1>
  );
}
