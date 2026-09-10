/**
 * What is printed on a tile face: the dots, the bamboo, and the bird.
 *
 * Drawn from a photograph of a real set rather than invented, which is the
 * difference between these and the first attempt. Three things that attempt
 * got wrong and this one does not:
 *
 *   - a dot is concentric rings, not a ring with a filled centre;
 *   - a bamboo stalk is a chain of segments pinched at the joints, not a bar;
 *   - the colours change from tile to tile. Black, green and red are used to
 *     tell counts apart at a glance across the table, which is the whole
 *     reason the convention exists.
 *
 * Colours are the palette's own, so these recolour with the site rather than
 * being pinned to ink black and pillarbox red.
 */

const BLACK = "var(--ink)";
const RED = "var(--tile-letter)";
const GREEN = "var(--jade)";

type Point = [number, number];

/* Coordinates are TileFaceArt's own 88 x 124 viewBox. The recessed panel runs
   x 7..81 and y 7..111, so marks stay inside roughly x 20..68, y 24..96. */

const DOT_LAYOUT: Record<number, Point[]> = {
  1: [[44, 59]],
  2: [[44, 38], [44, 80]],
  3: [[27, 31], [44, 59], [61, 87]],
  4: [[30, 39], [58, 39], [30, 79], [58, 79]],
  5: [[29, 33], [59, 33], [44, 59], [29, 85], [59, 85]],
  6: [[30, 30], [58, 30], [30, 59], [58, 59], [30, 88], [58, 88]],
  7: [[27, 27], [44, 27], [61, 27], [31, 65], [57, 65], [31, 91], [57, 91]],
  8: [[31, 26], [57, 26], [31, 48], [57, 48], [31, 70], [57, 70], [31, 92], [57, 92]],
  9: [[27, 31], [44, 31], [61, 31], [27, 59], [44, 59], [61, 59], [27, 87], [44, 87], [61, 87]],
};

/** Which colour each mark takes, in the order the layout lists them. */
const DOT_COLOURS: Record<number, string[]> = {
  1: [RED],
  2: [GREEN, GREEN],
  3: [RED, GREEN, GREEN],
  4: [BLACK, BLACK, BLACK, BLACK],
  5: [BLACK, BLACK, RED, BLACK, BLACK],
  6: [GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  7: [RED, RED, RED, GREEN, GREEN, GREEN, GREEN],
  8: [BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK],
  9: [GREEN, GREEN, GREEN, RED, RED, RED, BLACK, BLACK, BLACK],
};

const BAMBOO_LAYOUT: Record<number, Point[]> = {
  2: [[44, 37], [44, 81]],
  3: [[44, 30], [32, 79], [56, 79]],
  4: [[31, 37], [57, 37], [31, 81], [57, 81]],
  5: [[31, 31], [57, 31], [44, 59], [31, 87], [57, 87]],
  6: [[27, 37], [44, 37], [61, 37], [27, 81], [44, 81], [61, 81]],
  7: [[44, 25], [27, 62], [44, 62], [61, 62], [27, 93], [44, 93], [61, 93]],
  8: [[26, 36], [38, 44], [50, 44], [62, 36], [26, 84], [38, 76], [50, 76], [62, 84]],
  9: [[27, 28], [44, 28], [61, 28], [27, 59], [44, 59], [61, 59], [27, 90], [44, 90], [61, 90]],
};

const BAMBOO_COLOURS: Record<number, string[]> = {
  2: [GREEN, GREEN],
  3: [GREEN, GREEN, GREEN],
  4: [GREEN, GREEN, GREEN, GREEN],
  5: [GREEN, GREEN, RED, GREEN, GREEN],
  6: [GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  7: [RED, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  8: [GREEN, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
  9: [RED, RED, RED, GREEN, GREEN, GREEN, RED, RED, RED],
};

/** One dot: rings inside rings, which is what makes it read as a coin. */
function Dot({ x, y, r, colour }: { x: number; y: number; r: number; colour: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={colour} strokeWidth={r * 0.3} />
      <circle cx={x} cy={y} r={r * 0.5} fill="none" stroke={colour} strokeWidth={r * 0.24} />
      <circle cx={x} cy={y} r={r * 0.14} fill={colour} />
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
    return { cx: x + Math.cos(a) * r * 0.63, cy: y + Math.sin(a) * r * 0.63, i };
  });

  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={BLACK} strokeWidth={r * 0.13} />
      <circle cx={x} cy={y} r={r * 0.82} fill="none" stroke={GREEN} strokeWidth={r * 0.2} />
      {petals.map(({ cx, cy, i }) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r * 0.15}
          fill={i % 2 ? RED : GREEN}
        />
      ))}
      <circle cx={x} cy={y} r={r * 0.4} fill="none" stroke={RED} strokeWidth={r * 0.17} />
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
  const seg = h / 3;
  const w = h * 0.26;

  return (
    <g transform={tilt ? `rotate(${tilt} ${x} ${y})` : undefined}>
      {[0, 1, 2].map((i) => {
        const cy = y - h / 2 + seg * i + seg / 2;
        return (
          <g key={i}>
            <rect
              x={x - w / 2}
              y={cy - seg * 0.36}
              width={w}
              height={seg * 0.72}
              rx={w * 0.42}
              fill={colour}
            />
            {/* The joint: a short bar across the waist between segments. */}
            {i < 2 && (
              <rect
                x={x - w * 0.66}
                y={cy + seg * 0.4}
                width={w * 1.32}
                height={seg * 0.14}
                rx={seg * 0.07}
                fill={colour}
              />
            )}
          </g>
        );
      })}
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
    <g>
      {/* Tail, fanning down and left. */}
      <path
        d="M40 74 q-9 12 -14 22 q7 -5 12 -12"
        fill="none"
        stroke={RED}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M45 76 q-4 14 -5 24 q5 -8 8 -17"
        fill="none"
        stroke={RED}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M50 75 q3 13 7 21 q-1 -9 -3 -18"
        fill="none"
        stroke={RED}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Body. */}
      <path
        d="M44 34 q11 6 12 19 q1 13 -6 22 q-7 -3 -10 -12 q-3 -13 4 -29z"
        fill={GREEN}
      />

      {/* Wing, folded along the back. */}
      <path
        d="M47 44 q9 7 9 18 q0 8 -4 13 q-1 -14 -5 -31z"
        fill={BLACK}
        opacity="0.72"
      />

      {/* Fine feather cuts keep the silhouette readable at small sizes. */}
      <path d="M47 48 q4 10 4 18 M44 51 q1 9 5 16 M48 70 l3 3"
        fill="none" stroke="#fffdf6" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      <path d="M33 89 l4 -3 M43 91 l3 -5 M53 88 l1 -5"
        fill="none" stroke={GREEN} strokeWidth="1.3" strokeLinecap="round" />

      {/* Head and beak. */}
      <circle cx="41" cy="31" r="6.4" fill={GREEN} />
      <path d="M35 29 l-7 3 l7 3z" fill={RED} />
      <circle cx="42.6" cy="29.6" r="1.5" fill="#fffdf6" />

      {/* Crest. */}
      <path
        d="M43 25 q2 -7 7 -9 q-3 5 -3 9"
        fill="none"
        stroke={RED}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Feet. */}
      <path
        d="M44 76 l0 8 M44 84 l-4 4 M44 84 l4 4"
        fill="none"
        stroke={BLACK}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}
