/** Shared tile ink. The "black" of a printed set is really a deep blue. */
const BLUE = "#114ba3";
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
  // Six and seven are not grids: both sets put a small green group on top and
  // a red block of four underneath. Seven's top three run on a diagonal.
  6: [
    [31, 31],
    [57, 31],
    [31, 68],
    [57, 68],
    [31, 91],
    [57, 91],
  ],
  7: [
    [28, 26],
    [44, 38],
    [60, 50],
    [31, 72],
    [57, 72],
    [31, 93],
    [57, 93],
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

/**
 * Which colour each mark takes, in the order the layout lists them.
 *
 * These follow the common printed convention rather than being chosen for
 * looks: two is green and blue, five and nine carry red in the middle, six
 * and seven sit a green group over a red block of four, and eight is all
 * blue. Sets do vary, so check ours before treating this as the last word.
 */
const DOT_COLOURS: Record<number, string[]> = {
  1: [RED],
  2: [BLUE, GREEN],
  3: [GREEN, RED, BLUE],
  4: [BLUE, GREEN, GREEN, BLUE],
  5: [BLUE, GREEN, RED, GREEN, BLUE],
  6: [GREEN, GREEN, RED, RED, RED, RED],
  7: [GREEN, GREEN, GREEN, RED, RED, RED, RED],
  8: [BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE],
  9: [GREEN, GREEN, GREEN, RED, RED, RED, BLUE, BLUE, BLUE],
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

/**
 * Bamboo is green throughout except where a set marks it red: the middle
 * stalk of five, the single top stalk of seven, and the centre *column* of
 * nine (the layout below is row-major, so that is indices 1, 4 and 7).
 */
const BAMBOO_COLOURS: Record<number, string[]> = {
  2: [GREEN, GREEN],
  3: [GREEN, GREEN, GREEN],
  4: [GREEN, GREEN, GREEN, GREEN],
  5: [GREEN, GREEN, RED, GREEN, GREEN],
  6: [GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  7: [RED, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  9: [GREEN, RED, GREEN, GREEN, RED, GREEN, GREEN, RED, GREEN],
};

/**
 * One dot: a filled coin with a pale ring and a solid core.
 *
 * Deliberately only three shapes. The finer petal work that a real tile
 * carries is smaller than a pixel once nine of these sit on a 60px tile, so
 * it stopped reading as detail and started reading as a smudge.
 */
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
      <circle
        cx={x}
        cy={y}
        r={r * 0.62}
        fill="none"
        stroke="#fffdf6"
        strokeWidth={r * 0.22}
      />
      <circle cx={x} cy={y} r={r * 0.28} fill={colour} />
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

  // Nine marks need to be smaller to fit; below that there is room to draw
  // them large enough to count at a glance.
  const r = count >= 8 ? 9 : count >= 6 ? 10.5 : 11.5;
  return (
    <>
      {points.map(([x, y], i) => (
        <Dot key={i} x={x} y={y} r={r} colour={colours[i]} />
      ))}
    </>
  );
}

/**
 * The one dot, exported on its own because it rolls across the homepage.
 * Concentric rings alone are rotationally symmetric so rolling wouldn't
 * read; the eight petals make the rotation legible (and match a real 一筒).
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
        stroke={BLUE}
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
      <circle cx={x} cy={y} r={r * 0.12} fill={BLUE} />
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
  const w = h * 0.34;

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${tilt})`}
      fill="none"
      stroke={colour}
      strokeWidth={h * 0.1}
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

  // Eight stalks: upright sides and overlapping diagonals, as in the reference.
  if (count === 8)
    return (
      <g transform="translate(4.4 5.9) scale(.9)">
        <Stalk x={23} y={34} h={42} colour={GREEN} />
        <Stalk x={65} y={34} h={42} colour={GREEN} />
        <Stalk x={36} y={40} h={42} colour={GREEN} tilt={45} />
        <Stalk x={52} y={40} h={42} colour={GREEN} tilt={-45} />
        <Stalk x={23} y={84} h={42} colour={GREEN} />
        <Stalk x={65} y={84} h={42} colour={GREEN} />
        <Stalk x={36} y={78} h={42} colour={GREEN} tilt={-45} />
        <Stalk x={52} y={78} h={42} colour={GREEN} tilt={45} />
      </g>
    );

  const points = BAMBOO_LAYOUT[count];
  const colours = BAMBOO_COLOURS[count];
  const h = count >= 7 ? 26 : count >= 4 ? 32 : 36;

  return (
    <>
      {points.map(([x, y], i) => (
        <Stalk key={i} x={x} y={y} h={h} colour={colours[i]} />
      ))}
    </>
  );
}

/** One bamboo is a bird, not a stalk; every set draws it differently, so this
 * is a reading of the shape (body, cocked head, wing, red-fanned tail). */
export function Bird() {
  return (
    <g
      transform="translate(3.5 4.7) scale(.92)"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Perch, outlined body, and the folded blue wing. */}
      <path d="M18 69 Q42 67 66 64" stroke={GREEN} strokeWidth="2.5" />
      <path
        d="M41 34 C35 43 36 51 35 62 C49 64 59 53 60 43 C61 34 53 34 52 43"
        stroke={GREEN}
        strokeWidth="2"
      />
      <path
        d="M40 39 C25 29 23 43 26 52 C28 63 25 72 18 77 C31 74 36 63 37 52 Z"
        stroke={BLUE}
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
      <circle cx="43" cy="27" r="1.7" fill={GREEN} stroke="none" />
      <path
        d="M35 26 L30 24 L35 31 M37 21 Q30 14 45 16 Q55 17 59 12 Q56 24 43 21"
        stroke={RED}
        strokeWidth="2"
      />
      <path
        d="M33 65 Q32 88 50 106 M39 64 Q39 85 56 103"
        stroke={BLUE}
        strokeWidth="1.5"
      />
      <path
        d="M36 65 Q35 88 53 106 M43 62 Q43 85 59 101"
        stroke={RED}
        strokeWidth="1.5"
      />
      <path d="M40 64 Q40 86 54 102" stroke={GREEN} strokeWidth="1.5" />
    </g>
  );
}
