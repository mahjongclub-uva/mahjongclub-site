/**
 * Shared SVG definitions for the illustrated tiles: the recessed panel, the
 * bamboo stalk, the halftone sides and the engraved-ink filter, declared once
 * for every tile to reference by id.
 */

import { STALK } from "@/components/tracedStalk";

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
        {/* Recessed panel the character sits in. */}
        <linearGradient id="tilePanel" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fffefa" />
          <stop offset="0.55" stopColor="var(--tile-face)" />
          <stop offset="1" stopColor="#efe7d3" />
        </linearGradient>

        {/* Bamboo stalk, reused by every stalk tile. */}
        <path id="tileStalk" d={STALK} fillRule="evenodd" />

        {/* Cuts eight-bamboo's Vs off at its upright sticks. */}
        <clipPath id="eightVee" clipPathUnits="userSpaceOnUse">
          <rect x="30" y="0" width="28" height="124" />
        </clipPath>

        {/* Halftone for tile sides. */}
        <pattern
          id="tileHalftone"
          width="3.2"
          height="3.2"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <circle cx="1.6" cy="1.6" r="0.8" fill="var(--tile-back-hi)" />
        </pattern>

        {/* Engraved ink: a faint edge wobble and a thin shade on the top rim. */}
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
