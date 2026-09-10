import { TileFaceArt, TileBackArt } from "@/components/TileArt";

/**
 * One tile, turned over slowly as you scroll past it.
 *
 * The whole thing is a CSS scroll-driven animation on a named view-timeline:
 * the section declares the timeline, the tile reads it, and the browser
 * advances it off scroll position with no JavaScript, no listener and no
 * main-thread work. On a page that already runs a WebGL canvas in the header,
 * that is the difference between a flourish and a phone getting warm.
 *
 * Face-up is the resting state, same rule as the wordmark. Without the
 * @supports — Firefox today — the tile simply sits there face-up, which is a
 * perfectly good thing for it to do. Under reduced motion, likewise.
 *
 * East because it is where every hand starts, so the section says something
 * about the game rather than just moving.
 */
export default function InspectTile() {
  return (
    <section className="inspect" aria-labelledby="inspect-title">
      <div className="inspect-sticky">
        <div className="inspect-stage">
          <div className="inspect-tile" aria-hidden="true">
            <span className="inspect-face inspect-front">
              <TileFaceArt />
              <span className="inspect-glyph">東</span>
            </span>
            <span className="inspect-face inspect-back">
              <TileBackArt />
            </span>
            {/* Four walls, so the tile has a body. Two planes with nothing
                between them collapse to a line halfway through the turn. */}
            <span className="inspect-side inspect-side-l" />
            <span className="inspect-side inspect-side-r" />
            <span className="inspect-side inspect-side-t" />
            <span className="inspect-side inspect-side-b" />
          </div>
        </div>

        <div className="inspect-words">
          <h2 id="inspect-title">Every hand starts with East</h2>
          <p>
            Sixteen tiles in hand, a wall of the rest, and four people who all
            think they know what you are holding.
          </p>
        </div>
      </div>
    </section>
  );
}
