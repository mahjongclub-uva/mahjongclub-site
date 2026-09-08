import type { CSSProperties } from "react";
import { WORDMARK, CLUB_NAME, FULL_NAME } from "@/lib/site";
import { TileArtDefs, TileFaceArt, TileBackArt } from "@/components/TileArt";

/**
 * The club name as mahjong tiles, revealed in three beats: the tiles rise and
 * settle, then flip in a cascade, then the name fades in underneath.
 *
 * Load-bearing details:
 *
 *   - The letters are real characters in the DOM, so the name is selectable,
 *     indexable, and readable by a screen reader.
 *   - The <h1> carries an aria-label, because the word is split across seven
 *     elements and would otherwise be announced letter by letter.
 *   - Each tile carries its index as --i; both beats derive their delay from
 *     it in CSS, so the sequence needs no JavaScript.
 *
 * The nesting is two levels because .tile-scene moves and .tile rotates, and
 * one element cannot run two animations that both write `transform`.
 *
 * The resolved state — tiles up, faces out, name visible — is the DEFAULT.
 * The animations use `backwards` fill to hold their start state during the
 * delay. So reduced motion, a failed stylesheet, or a slow connection all
 * degrade to "the name is simply there". Never invert this.
 */
export default function Wordmark() {
  return (
    <h1 className="wordmark" aria-label={FULL_NAME}>
      {/* Gradients declared once and referenced by every tile. */}
      <TileArtDefs />
      <span className="wordmark-tiles">
        {WORDMARK.split("").map((letter, i) => (
          <span className="tile-scene" key={i} style={{ "--i": i } as CSSProperties}>
            <span className="tile">
              {/* Four side walls give the tile a body. Without them it is two
                  planes with nothing between, which collapses to a line
                  mid-flip and catches no light at rest. */}
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
