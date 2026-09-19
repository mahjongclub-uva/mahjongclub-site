import type { CSSProperties } from "react";
import { WORDMARK, CLUB_NAME, FULL_NAME } from "@/lib/site";
import { TileFaceArt, TileBackArt } from "@/components/TileArt";

/**
 * Club name as mahjong tiles, revealed in three beats: rise and settle, flip
 * in a cascade, then the name fades in underneath.
 *
 * Load-bearing details:
 *   - Letters are real DOM characters (selectable, indexable, screen-reader
 *     friendly). The <h1> needs aria-label since seven elements would
 *     otherwise be announced letter by letter.
 *   - Each tile carries --i; both beats derive their CSS delay from it, so
 *     the sequence needs no JS.
 *   - Nesting is two levels because .tile-scene moves and .tile rotates,
 *     and one element can't run two `transform` animations at once.
 *
 * The resolved state (tiles up, faces out, name visible) is the DEFAULT; the
 * animations use `backwards` fill to hold their start state during the
 * delay. So reduced motion, a failed stylesheet, or a slow connection all
 * degrade to "the name is simply there". Never invert this.
 */
export default function Wordmark() {
  return (
    <h1 className="wordmark" aria-label={FULL_NAME}>
      <span className="wordmark-tiles">
        {WORDMARK.split("").map((letter, i) => (
          <span
            className="tile-scene"
            key={i}
            style={{ "--i": i } as CSSProperties}
          >
            <span className="tile">
              {/* Side walls give the tile a body; without them it's two planes
                  that collapse to a line mid-flip. */}
              <span className="tile-side tile-side-l" aria-hidden="true" />
              <span className="tile-side tile-side-r" aria-hidden="true" />
              <span className="tile-side tile-side-t" aria-hidden="true" />
              <span className="tile-side tile-side-b" aria-hidden="true" />
              <span className="tile-back" aria-hidden="true">
                <TileBackArt />
              </span>
              <span className="tile-face">
                <TileFaceArt />
                <span className="tile-letter">{letter}</span>
              </span>
            </span>
          </span>
        ))}
      </span>
      <span className="wordmark-sub">{CLUB_NAME}</span>
    </h1>
  );
}
