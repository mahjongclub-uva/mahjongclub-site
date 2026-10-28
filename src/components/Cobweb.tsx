"use client";

import { useState } from "react";
import { IconSpiderFilled } from "@tabler/icons-react";
import { halloweenWeek } from "@/lib/season";

// An orb web in the top-right corner: spokes fan out from the corner, and
// each ring sags toward it between spokes, as silk does. Radii wobble a
// little, so it reads as spun rather than drawn with a compass.
const SPOKES = [92, 108, 125, 143, 161, 178].map((d) => (d * Math.PI) / 180);
const RINGS = [15, 29, 45, 63, 83];
const point = (r: number, a: number) => [
  100 + r * Math.cos(a),
  r * Math.sin(a),
];
const n = (v: number) => v.toFixed(1);
const SPOKE_PATH = SPOKES.map((a) => {
  const [x, y] = point(112, a);
  return `M100 0L${n(x)} ${n(y)}`;
}).join("");
const RING_PATH = RINGS.map((r, i) => {
  const at = SPOKES.map((a, j) =>
    point(r * (1 + (((i * 7 + j * 3) % 5) - 2) * 0.03), a),
  );
  return at
    .map(([x, y], j) => {
      if (j === 0) return `M${n(x)} ${n(y)}`;
      const [px, py] = at[j - 1];
      // The midpoint, pulled 22% of the way back toward the corner.
      const cx = 100 + ((px + x) / 2 - 100) * 0.78;
      const cy = ((py + y) / 2) * 0.78;
      return `Q${n(cx)} ${n(cy)} ${n(x)} ${n(y)}`;
    })
    .join("");
}).join("");
// Dew on a few crossings, where the light catches.
const DEW = [point(45, SPOKES[1]), point(63, SPOKES[3]), point(29, SPOKES[4])];

const strands = (
  <>
    <path className="cobweb-spokes" d={SPOKE_PATH} />
    <path className="cobweb-rings" d={RING_PATH} />
  </>
);

/** Halloween week only: a web in the corner of "You're in", and a spider on
 * a thread that runs back up when it is tapped, then creeps down again. */
export default function Cobweb() {
  const [scared, setScared] = useState(false);
  if (!halloweenWeek(new Date())) return null;
  const scare = () => {
    if (scared) return;
    setScared(true);
    setTimeout(() => setScared(false), 2400);
  };
  return (
    <span className="cobweb">
      {/* Three passes over the same silk: its shadow on the paper, the
          strand, and a highlight along its top edge. */}
      <svg
        className="cobweb-web"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <g className="cobweb-shadow">{strands}</g>
        <g className="cobweb-strand">{strands}</g>
        <g className="cobweb-shine">{strands}</g>
        {DEW.map(([x, y]) => (
          <circle key={x} className="cobweb-dew" cx={n(x)} cy={n(y)} r="1.3" />
        ))}
      </svg>
      <button
        type="button"
        className="cobweb-spider"
        data-scared={scared || undefined}
        aria-label="Scare the spider"
        onClick={scare}
      >
        <IconSpiderFilled aria-hidden="true" />
      </button>
    </span>
  );
}
