import { WORDMARK, CLUB_NAME, FULL_NAME } from "@/lib/site";

/**
 * Club name as flat mahjong tiles. The 3D scene (TileScene.tsx) draws the
 * animated version over this; these still tiles show only when that scene
 * doesn't: reduced motion, no WebGL, no JavaScript, or no 3D frame within 6s
 * of the visitor arriving.
 *
 * Load-bearing details:
 *   - Letters are real DOM characters (selectable, indexable, screen-reader
 *     friendly). The <h1> needs aria-label since seven elements would
 *     otherwise be announced letter by letter.
 *   - The <h1> holds the space and the accessible name in every state, so the
 *     canvas over it costs no layout shift.
 */
export default function Wordmark() {
  return (
    <h1 className="wordmark" aria-label={FULL_NAME}>
      <span className="wordmark-tiles">
        {WORDMARK.split("").map((letter, i) => (
          <span className="tile-scene" key={i}>
            <span className="tile">
              {/* Side walls give the tile a body under the row's perspective. */}
              <span className="tile-side tile-side-l" aria-hidden="true" />
              <span className="tile-side tile-side-r" aria-hidden="true" />
              <span className="tile-side tile-side-t" aria-hidden="true" />
              <span className="tile-side tile-side-b" aria-hidden="true" />
              <span className="tile-face">
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
