import type { ReactNode } from "react";
import { RED } from "@/components/TileArtwork";

const W = 86;
const H = 122;
const RX = 8;
const STEPS = 12;
const PAD = 20;

/** A tile lying at an angle, its side extruding toward `side` degrees. */
export default function TossedTile({
  side,
  depth = 15,
  faceDown = false,
  index,
  children,
}: {
  side: number;
  depth?: number;
  faceDown?: boolean;
  index?: number;
  children?: ReactNode;
}) {
  const dx = depth * Math.cos((side * Math.PI) / 180);
  const dy = depth * Math.sin((side * Math.PI) / 180);
  const [near, far] = faceDown
    ? ["var(--tile-side)", "var(--tile-body)"]
    : ["var(--tile-body)", "var(--tile-side)"];
  const rect = (i: number, fill: string, extra = {}) => (
    <rect
      key={i}
      x={1 + (dx * i) / STEPS}
      y={1 + (dy * i) / STEPS}
      width={W}
      height={H}
      rx={RX}
      fill={fill}
      {...extra}
    />
  );
  const layer = (from: number, to: number, fill: string, extra = {}) =>
    Array.from({ length: to - from + 1 }, (_, k) => rect(to - k, fill, extra));
  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${W + 2 * PAD} ${H + 2 * PAD}`}
      aria-hidden="true"
      focusable="false"
    >
      {layer(0, STEPS, RED, { stroke: RED, strokeWidth: 2.4 })}
      {layer(STEPS / 2, STEPS, far)}
      {rect(STEPS, "url(#tileHalftone)")}
      {layer(0, STEPS / 2, near)}
      {faceDown ? (
        <>
          {rect(0, "var(--tile-back-hi)")}
          {rect(0, "url(#tileHalftone)", { opacity: 0.5 })}
        </>
      ) : (
        <>
          {rect(0, "var(--tile-face)")}
          <g className="tile-ink">{children}</g>
          {index !== undefined && (
            <text
              x="6"
              y="18"
              fontFamily="var(--sans), sans-serif"
              fontWeight="700"
              fontSize="15"
              fill="var(--jade)"
            >
              {index}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
