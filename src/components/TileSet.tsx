import { TileFaceArt } from "@/components/TileArt";

/**
 * Every tile in a standard set, drawn rather than photographed.
 *
 * Drawn for three reasons: a photograph of the club's own set would have to be
 * consented to and stripped of EXIF like any other, stock tile images come
 * with licences nobody wants to audit in five years, and an SVG stays sharp
 * and recolours itself with the palette. Nothing here is fetched.
 *
 * The faces sit on the same <TileFaceArt> the header tiles use, so the set on
 * this page and the wordmark upstairs cannot drift apart.
 *
 * Each tile carries its name as visually hidden text. The drawing is the thing
 * you look at; the name is the thing a screen reader reads and the thing that
 * makes the page searchable for "seven of bamboo".
 */

/* The face's drawable area, in <TileFaceArt>'s own 88x124 coordinates. The
   recessed panel runs x 7..81 and y 7..111, so everything below stays inside
   roughly x 20..68 and y 24..94 to keep a margin. */

const NUMERALS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

type Point = [number, number];

/**
 * Where the circles go on a dots tile, by count.
 *
 * These are laid out to read at a glance rather than to copy any one
 * manufacturer: three runs on the diagonal, seven is a row above a block, and
 * one is a single large circle, which is how every set does it.
 */
const DOT_LAYOUT: Record<number, Point[]> = {
  1: [[44, 59]],
  2: [[44, 38], [44, 80]],
  3: [[26, 32], [44, 59], [62, 86]],
  4: [[29, 38], [59, 38], [29, 80], [59, 80]],
  5: [[29, 34], [59, 34], [44, 59], [29, 84], [59, 84]],
  6: [[29, 30], [59, 30], [29, 59], [59, 59], [29, 88], [59, 88]],
  7: [[26, 28], [44, 28], [62, 28], [31, 66], [57, 66], [31, 92], [57, 92]],
  8: [[31, 26], [57, 26], [31, 48], [57, 48], [31, 70], [57, 70], [31, 92], [57, 92]],
  9: [[26, 32], [44, 32], [62, 32], [26, 59], [44, 59], [62, 59], [26, 86], [44, 86], [62, 86]],
};

/** Same idea for bamboo, where each mark is a stick rather than a circle. */
const BAMBOO_LAYOUT: Record<number, Point[]> = {
  1: [[44, 59]],
  2: [[44, 38], [44, 80]],
  3: [[44, 30], [32, 78], [56, 78]],
  4: [[31, 38], [57, 38], [31, 80], [57, 80]],
  5: [[31, 32], [57, 32], [44, 59], [31, 86], [57, 86]],
  6: [[27, 38], [44, 38], [61, 38], [27, 80], [44, 80], [61, 80]],
  7: [[44, 26], [27, 62], [44, 62], [61, 62], [27, 94], [44, 94], [61, 94]],
  8: [[24, 38], [37, 38], [51, 38], [64, 38], [24, 80], [37, 80], [51, 80], [64, 80]],
  9: [[27, 28], [44, 28], [61, 28], [27, 59], [44, 59], [61, 59], [27, 90], [44, 90], [61, 90]],
};

function Dots({ count }: { count: number }) {
  const points = DOT_LAYOUT[count];
  // One dot is drawn large, the way a real 一筒 is — it is the only count that
  // gets the whole face to itself.
  const r = count === 1 ? 17 : 9.5;

  return (
    <>
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="none" stroke="var(--jade)" strokeWidth={r * 0.34} />
          <circle cx={x} cy={y} r={r * 0.3} fill="var(--tile-letter)" />
        </g>
      ))}
    </>
  );
}

function Bamboo({ count }: { count: number }) {
  const points = BAMBOO_LAYOUT[count];
  const tall = count === 1;
  const w = tall ? 11 : count === 8 ? 7 : 8;
  const h = tall ? 62 : count >= 7 ? 26 : 30;

  return (
    <>
      {points.map(([x, y], i) => (
        <g key={i}>
          <rect
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            rx={w / 2}
            fill="var(--tile-back-lo)"
          />
          {/* The two joints. A bamboo stick without them reads as a bar. */}
          <rect x={x - w / 2} y={y - h * 0.2} width={w} height={h * 0.09} fill="var(--tile-back-hi)" />
          <rect x={x - w / 2} y={y + h * 0.14} width={w} height={h * 0.09} fill="var(--tile-back-hi)" />
        </g>
      ))}
    </>
  );
}

/** One tile: the drawn face, whatever sits on it, and its name for a reader. */
function Tile({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li className="set-tile">
      <span className="set-tile-body">
        <TileFaceArt />
        <svg
          className="set-tile-ink"
          viewBox="0 0 88 124"
          aria-hidden="true"
          focusable="false"
        >
          {children}
        </svg>
      </span>
      <span className="sr-only">{name}</span>
    </li>
  );
}

/** A tile whose face is one or two Chinese characters rather than a drawing. */
function CharacterTile({
  name,
  top,
  bottom,
}: {
  name: string;
  top?: string;
  bottom: string;
}) {
  return (
    <Tile name={name}>
      {top && (
        <text className="set-ink-numeral" x="44" y="44" textAnchor="middle">
          {top}
        </text>
      )}
      <text
        className="set-ink-suit"
        x="44"
        y={top ? 92 : 74}
        textAnchor="middle"
        fontSize={top ? 34 : 52}
      >
        {bottom}
      </text>
    </Tile>
  );
}

function Group({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tile-group" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      <p className="tile-group-note">{note}</p>
      <ul className="tile-row">{children}</ul>
    </section>
  );
}

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function TileSet() {
  return (
    <div className="tile-set">
      <Group
        id="suit-characters"
        title="Characters"
        note="Read the number on top and 萬 underneath. Four of each, thirty-six in all."
      >
        {RANKS.map((n) => (
          <CharacterTile
            key={n}
            name={`${WORDS[n]} of characters`}
            top={NUMERALS[n]}
            bottom="萬"
          />
        ))}
      </Group>

      <Group
        id="suit-dots"
        title="Dots"
        note="Count the circles. One dot is drawn large and alone, which is how you tell it from the rest at speed."
      >
        {RANKS.map((n) => (
          <Tile key={n} name={`${WORDS[n]} of dots`}>
            <Dots count={n} />
          </Tile>
        ))}
      </Group>

      <Group
        id="suit-bamboo"
        title="Bamboo"
        note="Count the sticks. In most sets one bamboo is a bird rather than a stick — same tile, older joke."
      >
        {RANKS.map((n) => (
          <Tile key={n} name={`${WORDS[n]} of bamboo`}>
            <Bamboo count={n} />
          </Tile>
        ))}
      </Group>

      <Group
        id="honours-winds"
        title="Winds"
        note="East, south, west and north. No sequences — winds only ever group with their own kind."
      >
        <CharacterTile name="East wind" bottom="東" />
        <CharacterTile name="South wind" bottom="南" />
        <CharacterTile name="West wind" bottom="西" />
        <CharacterTile name="North wind" bottom="北" />
      </Group>

      <Group
        id="honours-dragons"
        title="Dragons"
        note="Red, green and white. The white dragon is a blank face in some sets and an empty frame in others."
      >
        <CharacterTile name="Red dragon" bottom="中" />
        <CharacterTile name="Green dragon" bottom="發" />
        <Tile name="White dragon">
          <rect
            x="24"
            y="28"
            width="40"
            height="62"
            rx="4"
            fill="none"
            stroke="var(--tile-back)"
            strokeWidth="4"
          />
        </Tile>
      </Group>

      <Group
        id="honours-flowers"
        title="Flowers and seasons"
        note="Eight singles that sit out of play. Not every set includes them, and not every table uses them when they do."
      >
        <CharacterTile name="Plum flower" bottom="梅" />
        <CharacterTile name="Orchid flower" bottom="蘭" />
        <CharacterTile name="Chrysanthemum flower" bottom="菊" />
        <CharacterTile name="Bamboo flower" bottom="竹" />
        <CharacterTile name="Spring season" bottom="春" />
        <CharacterTile name="Summer season" bottom="夏" />
        <CharacterTile name="Autumn season" bottom="秋" />
        <CharacterTile name="Winter season" bottom="冬" />
      </Group>
    </div>
  );
}
