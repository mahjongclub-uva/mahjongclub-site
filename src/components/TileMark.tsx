/**
 * The red dragon tile — 中, hóng zhōng.
 *
 * Chosen over the circles because recognition was the whole point: 一筒 is
 * concentric rings, which read as a target to anyone who has not played, while
 * 中 is the mahjong tile even non-players have seen. It is also a typographic
 * mark rather than a geometric one, which suits a page built on type.
 *
 * The glyph is drawn as paths rather than set as text, so it does not depend
 * on the visitor having a CJK font installed and cannot reflow.
 *
 * Decorative, and hidden from assistive technology — the club's name is
 * carried by the wordmark, not by this.
 */
export default function TileMark({
  height = 84,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      height={height}
      viewBox="0 0 64 90"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* The tile body, with the same weighted bottom edge as the wordmark.
          The tile is what makes the mark legible as mahjong rather than as a
          stray character. */}
      <rect
        x="1"
        y="1"
        width="62"
        height="82"
        rx="7"
        fill="var(--tile-face)"
        stroke="var(--tile-rim)"
        strokeWidth="1"
      />
      <path
        d="M1 76h62v1a6 6 0 0 1-6 6H7a6 6 0 0 1-6-6z"
        fill="var(--tile-edge)"
      />

      {/* 中 — the enclosure, then the stroke through it. Squared off rather
          than brushed: the page is quiet and geometric, and a calligraphic
          rendering would be the loudest thing on it. */}
      <g fill="none" stroke="var(--tile-letter)" strokeWidth="4.6">
        <rect x="19" y="26" width="26" height="27" rx="1.5" />
        <path d="M32 13v57" strokeLinecap="butt" />
      </g>
    </svg>
  );
}
