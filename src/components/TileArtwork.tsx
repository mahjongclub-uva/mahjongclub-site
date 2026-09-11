/** Shared tile ink, styled after the supplied blue, green, and orange reference. */
const BLACK = "#114ba3";
const RED = "#c94219";
const GREEN = "#236951";

type Point = [number, number];

/* Coordinates are TileFaceArt's own 88 x 124 viewBox. The recessed panel runs
   x 7..81 and y 7..111, so marks stay inside roughly x 20..68, y 24..96. */

const DOT_LAYOUT: Record<number, Point[]> = {
  1: [[44, 59]],
  2: [
    [44, 38],
    [44, 80],
  ],
  3: [
    [27, 31],
    [44, 59],
    [61, 87],
  ],
  4: [
    [30, 39],
    [58, 39],
    [30, 79],
    [58, 79],
  ],
  5: [
    [29, 33],
    [59, 33],
    [44, 59],
    [29, 85],
    [59, 85],
  ],
  6: [
    [30, 30],
    [58, 30],
    [30, 59],
    [58, 59],
    [30, 88],
    [58, 88],
  ],
  7: [
    [27, 27],
    [44, 27],
    [61, 27],
    [31, 65],
    [57, 65],
    [31, 91],
    [57, 91],
  ],
  8: [
    [31, 26],
    [57, 26],
    [31, 48],
    [57, 48],
    [31, 70],
    [57, 70],
    [31, 92],
    [57, 92],
  ],
  9: [
    [27, 31],
    [44, 31],
    [61, 31],
    [27, 59],
    [44, 59],
    [61, 59],
    [27, 87],
    [44, 87],
    [61, 87],
  ],
};

/** Which colour each mark takes, in the order the layout lists them. */
const DOT_COLOURS: Record<number, string[]> = {
  1: [RED],
  2: [BLACK, GREEN],
  3: [RED, GREEN, GREEN],
  4: [BLACK, BLACK, BLACK, BLACK],
  5: [BLACK, BLACK, RED, BLACK, BLACK],
  6: [BLACK, BLACK, BLACK, GREEN, GREEN, GREEN],
  7: [RED, RED, RED, GREEN, GREEN, GREEN, GREEN],
  8: [BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK],
  9: [GREEN, GREEN, GREEN, RED, RED, RED, BLACK, BLACK, BLACK],
};

const BAMBOO_LAYOUT: Record<number, Point[]> = {
  2: [
    [44, 37],
    [44, 81],
  ],
  3: [
    [44, 30],
    [32, 79],
    [56, 79],
  ],
  4: [
    [31, 37],
    [57, 37],
    [31, 81],
    [57, 81],
  ],
  5: [
    [31, 31],
    [57, 31],
    [44, 59],
    [31, 87],
    [57, 87],
  ],
  6: [
    [27, 37],
    [44, 37],
    [61, 37],
    [27, 81],
    [44, 81],
    [61, 81],
  ],
  7: [
    [44, 25],
    [27, 62],
    [44, 62],
    [61, 62],
    [27, 93],
    [44, 93],
    [61, 93],
  ],
  8: [
    [26, 36],
    [38, 44],
    [50, 44],
    [62, 36],
    [26, 84],
    [38, 76],
    [50, 76],
    [62, 84],
  ],
  9: [
    [27, 28],
    [44, 28],
    [61, 28],
    [27, 59],
    [44, 59],
    [61, 59],
    [27, 90],
    [44, 90],
    [61, 90],
  ],
};

const BAMBOO_COLOURS: Record<number, string[]> = {
  2: [BLACK, GREEN],
  3: [GREEN, GREEN, GREEN],
  4: [GREEN, GREEN, GREEN, GREEN],
  5: [BLACK, GREEN, RED, GREEN, BLACK],
  6: [BLACK, BLACK, BLACK, GREEN, GREEN, GREEN],
  7: [RED, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  8: [GREEN, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  9: [RED, RED, RED, GREEN, GREEN, GREEN, RED, RED, RED],
};

/** One dot: rings inside rings, which is what makes it read as a coin. */
function Dot({
  x,
  y,
  r,
  colour,
}: {
  x: number;
  y: number;
  r: number;
  colour: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={colour} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${x} ${y - r * 0.2} c${-r * 0.55} ${-r * 0.7}, ${r * 0.55} ${-r * 0.7}, 0 0`}
          transform={`rotate(${i * 72} ${x} ${y})`}
          fill="none"
          stroke="#fffdf6"
          strokeWidth={r * 0.12}
          strokeLinecap="round"
        />
      ))}
      <circle cx={x} cy={y} r={r * 0.13} fill="#fffdf6" />
    </g>
  );
}

export function Dots({ count }: { count: number }) {
  const points = DOT_LAYOUT[count];
  const colours = DOT_COLOURS[count];

  // One dot has the face to itself and carries more rings than the rest,
  // which is how every set draws it.
  if (count === 1) {
    const [[x, y]] = points;
    return <OneDot x={x} y={y} r={23} />;
  }

  const r = count >= 8 ? 8.5 : 9.5;
  return (
    <>
      {points.map(([x, y], i) => (
        <Dot key={i} x={x} y={y} r={r} colour={colours[i]} />
      ))}
    </>
  );
}

/**
 * The one dot, drawn on its own.
 *
 * Pulled out as its own export because it rolls across the homepage, and that
 * is what forces the petals. Concentric rings are rotationally symmetric — a
 * ring turning looks exactly like a ring standing still, so a dot made only of
 * rings cannot be seen to roll. The eight petals are what make the rotation
 * legible, and they are also closer to the ornate 一筒 a real set carries.
 */
export function OneDot({ x, y, r }: { x: number; y: number; r: number }) {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI * 2) / 8;
    return {
      cx: x + Math.cos(a) * r * 0.63,
      cy: y + Math.sin(a) * r * 0.63,
      i,
    };
  });

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke={BLACK}
        strokeWidth={r * 0.13}
      />
      <circle
        cx={x}
        cy={y}
        r={r * 0.82}
        fill="none"
        stroke={GREEN}
        strokeWidth={r * 0.2}
      />
      {petals.map(({ cx, cy, i }) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r * 0.15}
          fill={i % 2 ? RED : GREEN}
        />
      ))}
      <circle
        cx={x}
        cy={y}
        r={r * 0.4}
        fill="none"
        stroke={RED}
        strokeWidth={r * 0.17}
      />
      <circle cx={x} cy={y} r={r * 0.12} fill={BLACK} />
    </g>
  );
}

/**
 * One bamboo stalk: three segments with pinched joints.
 *
 * The pinch is the whole tell. A plain bar reads as a domino pip; the waisted
 * chain reads as cane.
 */
function Stalk({
  x,
  y,
  h,
  colour,
  tilt = 0,
}: {
  x: number;
  y: number;
  h: number;
  colour: string;
  tilt?: number;
}) {
  const w = h * 0.26;

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${tilt})`}
      fill="none"
      stroke={colour}
      strokeWidth={h * 0.075}
      strokeLinejoin="round"
    >
      <path
        d={`M${-w / 2} ${-h / 2} Q0 ${-h / 2 - 1} ${w / 2} ${-h / 2}
        L${w / 2} ${-h * 0.36} Q${w * 0.18} 0 ${w / 2} ${h * 0.36}
        L${w / 2} ${h / 2} Q0 ${h / 2 + 1} ${-w / 2} ${h / 2}
        L${-w / 2} ${h * 0.36} Q${-w * 0.18} 0 ${-w / 2} ${-h * 0.36} Z`}
      />
      <path
        d={`M${-w / 2} ${-h * 0.36} H${w / 2} M${-w / 2} ${h * 0.36} H${w / 2} M${-w * 0.3} 0 H${w * 0.3}`}
      />
    </g>
  );
}

export function Bamboo({ count }: { count: number }) {
  if (count === 1) return <Bird />;

  const points = BAMBOO_LAYOUT[count];
  const colours = BAMBOO_COLOURS[count];
  const h = count >= 7 ? 26 : count >= 4 ? 32 : 36;

  // Eight is the odd one: the stalks lean into each other in a shallow W
  // rather than sitting in rows.
  const tilts: Record<number, number[]> = {
    8: [-13, -13, 13, 13, 13, 13, -13, -13],
  };

  return (
    <>
      {points.map(([x, y], i) => (
        <Stalk
          key={i}
          x={x}
          y={y}
          h={h}
          colour={colours[i]}
          tilt={tilts[count]?.[i] ?? 0}
        />
      ))}
    </>
  );
}

/**
 * One bamboo, which is a bird rather than a stalk.
 *
 * Every set draws it differently — peacock, sparrow, something in between —
 * so this is a reading of the shape rather than a copy: body, cocked head,
 * one wing, and a tail that fans red the way the reference set's does.
 */
export function Bird() {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Perch, outlined body, and the folded blue wing. */}
      <path d="M18 69 Q42 67 66 64" stroke={GREEN} strokeWidth="2.5" />
      <path
        d="M41 34 C35 43 36 51 35 62 C49 64 59 53 60 43 C61 34 53 34 52 43"
        stroke={GREEN}
        strokeWidth="2"
      />
      <path
        d="M40 39 C25 29 23 43 26 52 C28 63 25 72 18 77 C31 74 36 63 37 52 Z"
        stroke={BLACK}
        strokeWidth="2"
      />
      <path
        d="M38 46 Q47 48 47 39 M41 44 L40 54 M46 44 L45 53 M50 42 L49 51"
        stroke={GREEN}
        strokeWidth="1.5"
      />
      {/* Small crested head and a long, fine fan of tail feathers. */}
      <path
        d="M39 36 C34 32 34 23 39 21 C47 17 52 24 50 33 L47 40"
        stroke={GREEN}
        strokeWidth="2"
      />
      <circle cx="43" cy="27" r="2" stroke={GREEN} strokeWidth="1.5" />
      <path
        d="M35 26 L30 24 L35 31 M37 21 Q30 14 45 16 Q55 17 59 12 Q56 24 43 21"
        stroke={RED}
        strokeWidth="2"
      />
      <path
        d="M33 65 Q32 88 50 106 M39 64 Q39 85 56 103"
        stroke={BLACK}
        strokeWidth="1.5"
      />
      <path
        d="M36 65 Q35 88 53 106 M43 62 Q43 85 59 101"
        stroke={RED}
        strokeWidth="1.5"
      />
      <path d="M40 64 Q40 87 56 106" stroke={GREEN} strokeWidth="1.5" />
    </g>
  );
}
