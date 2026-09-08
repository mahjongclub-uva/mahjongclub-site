/**
 * The tile drawn as artwork rather than assembled from CSS gradients.
 *
 * A CSS box can only be a rounded rectangle with a flat fill. A real tile has
 * a moulded shoulder, a recessed face panel, warm shading that turns as it
 * wraps the edge, and a green base that shows below the ivory — none of which
 * a background gradient can hold. Drawing it means the bevel is painted in,
 * the way it is in an illustration.
 *
 * The gradients are declared once by <TileArtDefs> and referenced by every
 * tile, so seven tiles cost one set of definitions rather than seven.
 *
 * The letter is NOT drawn here. It stays real text in the DOM, sitting on top
 * of this.
 */

const VIEW = "0 0 88 124";

/** Render once, high in the tree. Paints nothing itself. */
export function TileArtDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        {/* Ivory body: lit from the top-left, warming into shadow bottom-right. */}
        <linearGradient id="tileBody" x1="0.05" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="var(--tile-face-hi)" />
          <stop offset="0.42" stopColor="var(--tile-face)" />
          <stop offset="1" stopColor="var(--tile-face-lo)" />
        </linearGradient>

        {/* The recessed panel the character sits in, very slightly cooler. */}
        <linearGradient id="tilePanel" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fffefa" />
          <stop offset="0.55" stopColor="var(--tile-face)" />
          <stop offset="1" stopColor="#efe7d3" />
        </linearGradient>

        {/* Green base, showing under the ivory the way a real tile's backing does. */}
        <linearGradient id="tileBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--tile-back-hi)" />
          <stop offset="1" stopColor="var(--tile-back-lo)" />
        </linearGradient>

        {/* Jade reverse. */}
        <linearGradient id="tileReverse" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="var(--tile-back-hi)" />
          <stop offset="0.5" stopColor="var(--tile-back)" />
          <stop offset="1" stopColor="var(--tile-back-lo)" />
        </linearGradient>

        {/* A sheen falling across the top-left, which is what stops a flat
            colour reading as plastic. */}
        <linearGradient id="tileSheen" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function TileFaceArt() {
  return (
    <svg className="tile-art" viewBox={VIEW} aria-hidden="true" focusable="false">
      {/* Green backing, showing as a sliver along the bottom. */}
      <rect x="0" y="0" width="88" height="124" rx="11" fill="url(#tileBase)" />
      {/* Ivory body, stopping short so the backing shows. */}
      <rect x="0" y="0" width="88" height="118" rx="11" fill="url(#tileBody)" />
      {/* Shoulder: a lit edge along the top-left, shaded along the bottom-right. */}
      <path
        d="M11 1h66a10 10 0 0 1 10 10v96a10 10 0 0 1-10 10H11A10 10 0 0 1 1 107V11A10 10 0 0 1 11 1z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="1.6"
      />
      {/* The recessed panel. */}
      <rect x="7" y="7" width="74" height="104" rx="7" fill="url(#tilePanel)" />
      {/* Inner shadow at the top of the panel, so it reads as sunk rather than
          raised — the one cue that separates a carved tile from a printed card. */}
      <path
        d="M14 7h60a7 7 0 0 1 7 7v3a7 7 0 0 0-7-7H14a7 7 0 0 0-7 7v-3a7 7 0 0 1 7-7z"
        fill="#8a7a55"
        fillOpacity="0.22"
      />
      <rect x="7" y="7" width="74" height="104" rx="7" fill="url(#tileSheen)" />
    </svg>
  );
}

export function TileBackArt() {
  return (
    <svg className="tile-art" viewBox={VIEW} aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="88" height="124" rx="11" fill="url(#tileReverse)" />
      <path
        d="M11 1h66a10 10 0 0 1 10 10v102a10 10 0 0 1-10 10H11a10 10 0 0 1-10-10V11A10 10 0 0 1 11 1z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="1.6"
      />
      <rect x="0" y="0" width="88" height="124" rx="11" fill="url(#tileSheen)" />
    </svg>
  );
}
