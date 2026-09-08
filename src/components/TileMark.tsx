/**
 * A single mahjong tile bearing the one-of-circles mark.
 *
 * An earlier version drew the circles alone, and it read as a target rather
 * than as mahjong — concentric rings only mean anything to someone who
 * already knows the tile. The tile body is what supplies the recognition, so
 * it has to be there: the proportion, the rounded corners, the weighted
 * bottom edge.
 *
 * Decorative, and hidden from assistive technology.
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
      {/* The tile body, with the same weighted bottom edge as the wordmark. */}
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

      {/* The mark. Rings rather than filled discs, and the innermost is
          vermilion — the two colours a real character tile actually uses. */}
      <g fill="none" strokeWidth="3.2">
        <circle cx="32" cy="42" r="19" stroke="var(--tile-back)" />
        <circle cx="32" cy="42" r="11.5" stroke="var(--tile-letter)" />
      </g>
      <circle cx="32" cy="42" r="4.4" fill="var(--tile-back)" />
    </svg>
  );
}
