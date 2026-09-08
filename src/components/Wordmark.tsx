import type { CSSProperties } from "react";
import { WORDMARK, CLUB_NAME, FULL_NAME } from "@/lib/site";

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
      <span className="wordmark-tiles">
        {WORDMARK.split("").map((letter, i) => (
          <span className="tile-scene" key={i} style={{ "--i": i } as CSSProperties}>
            <span className="tile">
              <span className="tile-back" aria-hidden="true" />
              <span className="tile-face">{letter}</span>
            </span>
          </span>
        ))}
      </span>
      <span className="wordmark-sub">{CLUB_NAME}</span>
    </h1>
  );
}
