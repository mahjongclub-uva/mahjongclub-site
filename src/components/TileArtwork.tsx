/** Shared tile ink. The "black" of a printed set is really a deep blue. */
export const BLUE = "#114ba3";
export const RED = "#c94219";
export const GREEN = "#236951";
/** Cut-outs in the ink are the tile face showing through. */
const FACE = "var(--tile-face-hi)";

type Point = [number, number];

/* Coordinates are the tile face's 88 x 124 box; marks keep clear of the
   top-left index. */

const DOT_LAYOUT: Record<number, { r: number; points: Point[] }> = {
  2: {
    r: 14,
    points: [
      [44, 38],
      [44, 88],
    ],
  },
  3: {
    r: 13,
    points: [
      [25, 33],
      [44, 62],
      [63, 91],
    ],
  },
  4: {
    r: 13,
    points: [
      [27, 40],
      [61, 40],
      [27, 84],
      [61, 84],
    ],
  },
  5: {
    r: 12,
    points: [
      [26, 34],
      [62, 34],
      [44, 62],
      [26, 90],
      [62, 90],
    ],
  },
  6: {
    r: 11.5,
    points: [
      [29, 32],
      [59, 32],
      [29, 70],
      [59, 70],
      [29, 95],
      [59, 95],
    ],
  },
  7: {
    r: 10.5,
    points: [
      [24, 28],
      [44, 40],
      [64, 52],
      [30, 75],
      [58, 75],
      [30, 99],
      [58, 99],
    ],
  },
  8: {
    r: 10,
    points: [
      [32, 29],
      [56, 29],
      [32, 53],
      [56, 53],
      [32, 77],
      [56, 77],
      [32, 101],
      [56, 101],
    ],
  },
  9: {
    r: 10,
    points: [
      [22, 34],
      [44, 34],
      [66, 34],
      [22, 62],
      [44, 62],
      [66, 62],
      [22, 90],
      [44, 90],
      [66, 90],
    ],
  },
};

/** Colours in layout order, from the club's set. */
const DOT_COLOURS: Record<number, string[]> = {
  2: [GREEN, BLUE],
  3: [GREEN, RED, BLUE],
  4: [BLUE, GREEN, GREEN, BLUE],
  5: [BLUE, GREEN, RED, GREEN, BLUE],
  6: [GREEN, GREEN, RED, RED, RED, RED],
  7: [GREEN, GREEN, GREEN, RED, RED, RED, RED],
  8: Array(8).fill(BLUE),
  9: [GREEN, GREEN, GREEN, RED, RED, RED, BLUE, BLUE, BLUE],
};

/** A solid disc with two fine rings cut into it. */
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
      <g fill="none" stroke={FACE} strokeWidth={r * 0.1}>
        <circle cx={x} cy={y} r={r * 0.66} />
        <circle cx={x} cy={y} r={r * 0.34} />
      </g>
    </g>
  );
}

export function Dots({ count }: { count: number }) {
  if (count === 1) return <OneDot x={44} y={62} r={32} />;
  const { r, points } = DOT_LAYOUT[count];
  return (
    <>
      {points.map(([x, y], i) => (
        <Dot key={i} x={x} y={y} r={r} colour={DOT_COLOURS[count][i]} />
      ))}
    </>
  );
}

/** The one dot; also the homepage's rolling dot. */
export function OneDot({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g fill="none" stroke={GREEN} strokeWidth={r * 0.07}>
        {Array.from({ length: 16 }, (_, i) => (
          <ellipse
            key={i}
            cy={-r * 0.71}
            rx={r * 0.13}
            ry={r * 0.25}
            transform={`rotate(${i * 22.5})`}
          />
        ))}
        <circle r={r * 0.46} />
      </g>
      <circle r={r * 0.38} fill={RED} />
      <path
        d={`M${-r * 0.2} ${-r * 0.05} Q0 ${-r * 0.32} ${r * 0.2} ${-r * 0.05}
            M${-r * 0.24} ${r * 0.05} H${r * 0.24}
            M${-r * 0.13} ${r * 0.05} V${r * 0.2} H${r * 0.13} V${r * 0.05}
            M0 ${-r * 0.19} V${r * 0.2}`}
        fill="none"
        stroke={FACE}
        strokeWidth={r * 0.06}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** One stalk, defined once in <TileArtDefs> as #tileStalk. */
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
  return (
    <use
      href="#tileStalk"
      fill={colour}
      transform={`translate(${x} ${y}) rotate(${tilt}) scale(${STALK_WIDTH} ${h / 100})`}
    />
  );
}

type StalkSpec = [
  x: number,
  y: number,
  colour: string,
  h?: number,
  tilt?: number,
];

/** Every stalk is the same thickness, whatever its length. */
const STALK_WIDTH = 0.26;

const BAMBOO_LAYOUT: Record<number, { h: number; stalks: StalkSpec[] }> = {
  2: {
    h: 42,
    stalks: [
      [44, 38, GREEN],
      [44, 86, GREEN],
    ],
  },
  3: {
    h: 40,
    stalks: [
      [44, 36, GREEN],
      [30, 86, GREEN],
      [58, 86, GREEN],
    ],
  },
  4: {
    h: 40,
    stalks: [
      [30, 38, GREEN],
      [58, 38, GREEN],
      [30, 86, GREEN],
      [58, 86, GREEN],
    ],
  },
  5: {
    h: 38,
    stalks: [
      [24, 36, GREEN],
      [64, 36, GREEN],
      [44, 62, RED],
      [24, 88, GREEN],
      [64, 88, GREEN],
    ],
  },
  6: {
    h: 40,
    stalks: [
      [24, 38, GREEN],
      [44, 38, GREEN],
      [64, 38, GREEN],
      [24, 86, GREEN],
      [44, 86, GREEN],
      [64, 86, GREEN],
    ],
  },
  7: {
    h: 28,
    stalks: [
      [44, 28, RED],
      [24, 62, GREEN],
      [44, 62, BLUE],
      [64, 62, GREEN],
      [24, 94, GREEN],
      [44, 94, BLUE],
      [64, 94, GREEN],
    ],
  },
  // Two Ms: V arms first, then the upright sticks in front.
  8: {
    h: 38,
    stalks: [
      [37.25, 34.5, GREEN, 23.3, 35.4],
      [50.75, 34.5, GREEN, 23.3, -35.4],
      [37.25, 81.5, GREEN, 26.7, 149.6],
      [50.75, 81.5, GREEN, 26.7, -149.6],
      [28, 33.5, GREEN],
      [60, 33.5, GREEN],
      [28, 81, GREEN, 44],
      [60, 81, GREEN, 44],
    ],
  },
  9: {
    h: 27,
    stalks: [
      [24, 28, GREEN],
      [44, 28, RED],
      [64, 28, GREEN],
      [24, 62, GREEN],
      [44, 62, RED],
      [64, 62, GREEN],
      [24, 96, GREEN],
      [44, 96, RED],
      [64, 96, GREEN],
    ],
  },
};

/** Joins each V's arms into one continuous stalk: a filled bend, one groove. */
const EIGHT_VEES = ["M30.5 44 L44 25 L57.5 44", "M30.5 70 L44 93 L57.5 70"];

function VeeJoin({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={GREEN} strokeWidth={8.3} />
      <path d={d} stroke={FACE} strokeWidth={0.98} />
    </g>
  );
}

/** Stalk tiles, two to nine. */
export function Bamboo({ count }: { count: number }) {
  const { h, stalks } = BAMBOO_LAYOUT[count];
  const [under, over] =
    count === 8 ? [stalks.slice(0, 4), stalks.slice(4)] : [[], stalks];
  const draw = (list: StalkSpec[]) =>
    list.map(([x, y, colour, length = h, tilt], i) => (
      <Stalk key={i} x={x} y={y} h={length} colour={colour} tilt={tilt} />
    ));
  return (
    <>
      <g clipPath={count === 8 ? "url(#eightVee)" : undefined}>
        {draw(under)}
        {count === 8 && EIGHT_VEES.map((d) => <VeeJoin key={d} d={d} />)}
      </g>
      {draw(over)}
    </>
  );
}
