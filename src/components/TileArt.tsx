/**
 * The tile's bevel/shading, drawn as SVG rather than CSS gradients (a CSS box
 * can't hold a moulded shoulder, a recessed panel, and a green base peeking
 * out below). <TileArtDefs> declares the gradients once for every tile to
 * share. The letter itself is not drawn here, it stays real DOM text on top.
 */

import { STALK } from "@/components/tracedStalk";

const VIEW = "0 0 88 124";

/** Render once, high in the tree; paints nothing itself. */
export function TileArtDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute" }}
    >
      <defs>
        {/* Ivory body, lit top-left. */}
        <linearGradient id="tileBody" x1="0.05" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="var(--tile-face-hi)" />
          <stop offset="0.42" stopColor="var(--tile-face)" />
          <stop offset="1" stopColor="var(--tile-face-lo)" />
        </linearGradient>

        {/* Recessed panel the character sits in. */}
        <linearGradient id="tilePanel" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fffefa" />
          <stop offset="0.55" stopColor="var(--tile-face)" />
          <stop offset="1" stopColor="#efe7d3" />
        </linearGradient>

        {/* Green base, showing under the ivory. */}
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

        {/* Sheen, so the flat colour doesn't read as plastic. */}
        <linearGradient id="tileSheen" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* One traced bamboo stalk; every stalk tile draws copies of it. */}
        <path id="tileStalk" d={STALK} fillRule="evenodd" />

        {/* The span between eight-bamboo's upright sticks: its Vs are cut to
            it, so they end where they meet the sticks. */}
        <clipPath id="eightVee" clipPathUnits="userSpaceOnUse">
          <rect x="30" y="0" width="28" height="124" />
        </clipPath>

        {/* Printed halftone for the illustrated tiles' celadon edge. */}
        <pattern
          id="tileHalftone"
          width="3.2"
          height="3.2"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <circle cx="1.6" cy="1.6" r="0.8" fill="var(--tile-back-hi)" />
        </pattern>

        {/* Engraved ink, for every mark on the illustrated tiles. The set's
            marks are cut into the tile and filled with paint, so the edge is
            never quite machine-crisp (a faint wobble) and the top of each
            recess sits in a little shadow (a thin inner shade). Kept faint
            enough to leave the marks crisp at phone size. */}
        <filter id="engrave" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.1"
            numOctaves="2"
            seed="3"
            result="grain"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale="0.9"
            xChannelSelector="R"
            yChannelSelector="G"
            result="ink"
          />
          <feOffset in="ink" dx="0.35" dy="0.6" result="shifted" />
          <feComposite in="ink" in2="shifted" operator="out" result="rim" />
          <feFlood floodColor="#000" floodOpacity="0.28" />
          <feComposite in2="rim" operator="in" result="shade" />
          <feMerge>
            <feMergeNode in="ink" />
            <feMergeNode in="shade" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export function TileFaceArt() {
  return (
    <svg
      className="tile-art"
      viewBox={VIEW}
      aria-hidden="true"
      focusable="false"
    >
      {/* Green backing, visible as a sliver along the bottom. */}
      <rect x="0" y="0" width="88" height="124" rx="11" fill="url(#tileBase)" />
      {/* Ivory body, stopping short so the backing shows. */}
      <rect x="0" y="0" width="88" height="118" rx="11" fill="url(#tileBody)" />
      {/* Shoulder edge. */}
      <path
        d="M11 1h66a10 10 0 0 1 10 10v96a10 10 0 0 1-10 10H11A10 10 0 0 1 1 107V11A10 10 0 0 1 11 1z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="1.6"
      />
      {/* Recessed panel. */}
      <rect x="7" y="7" width="74" height="104" rx="7" fill="url(#tilePanel)" />
      {/* Inner shadow, so the panel reads as sunk rather than raised. */}
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
    <svg
      className="tile-art"
      viewBox={VIEW}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0"
        y="0"
        width="88"
        height="124"
        rx="11"
        fill="url(#tileReverse)"
      />
      <path
        d="M11 1h66a10 10 0 0 1 10 10v102a10 10 0 0 1-10 10H11a10 10 0 0 1-10-10V11A10 10 0 0 1 11 1z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="1.6"
      />
      <rect
        x="0"
        y="0"
        width="88"
        height="124"
        rx="11"
        fill="url(#tileSheen)"
      />
    </svg>
  );
}
