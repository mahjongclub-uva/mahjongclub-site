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
 * The face carries a tile but the words do not explain one: the homepage is
 * about the club, and anyone who wants the game itself has the guide.
 */
/** Enough slices that the rim reads as solid rather than as stripes. */
const SLICES = 24;

export default function InspectTile() {
  return (
    <section className="inspect" aria-labelledby="inspect-title">
      <div className="inspect-sticky">
        <div className="inspect-stage">
          <div className="inspect-tile" aria-hidden="true">
            {/* The body, as a stack of slices.

                Four flat walls cannot make a rounded block: the face is a
                rounded rectangle and a wall is a plain one, so the wall's
                square corners stick out past the silhouette at the top and
                bottom. That is the sharp edge.

                Stacking copies of the rounded shape along Z solves it for
                every viewing angle at once, because every slice has the same
                outline as the face. The back third is green, which is how a
                real tile is built: an ivory block on a green backing plate. */}
            {Array.from({ length: SLICES }, (_, i) => {
              const t = i / (SLICES - 1);
              return (
                <span
                  key={i}
                  className={t > 0.66 ? "inspect-slice is-backing" : "inspect-slice"}
                  style={{ "--t": t } as React.CSSProperties}
                />
              );
            })}

            <span className="inspect-face inspect-front">
              <TileFaceArt />
              <span className="inspect-glyph">東</span>
            </span>
            <span className="inspect-face inspect-back">
              <TileBackArt />
            </span>
          </div>
        </div>

        <div className="inspect-words">
          <h2 id="inspect-title">There is a seat at the table</h2>
          <p>
            No experience, no set, no commitment. Turn up on a Friday and
            somebody will deal you in.
          </p>
        </div>
      </div>
    </section>
  );
}
