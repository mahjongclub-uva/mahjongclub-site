import { TileFaceArt } from "@/components/TileArt";
import { Dots, Bamboo } from "@/components/TileArtwork";

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

const NUMERALS = ["", "一", "二", "三", "四", "伍", "六", "七", "八", "九"];
const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

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
        note="The number on top, 萬 underneath. Five is written 伍, the formal numeral, the way a cheque spells it out."
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
        note="Count the rings. One is drawn large and alone; the colours change from tile to tile so you can read a count across the table without counting."
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
        note="Count the stalks. One bamboo is a bird, which every set draws differently and none explains."
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
