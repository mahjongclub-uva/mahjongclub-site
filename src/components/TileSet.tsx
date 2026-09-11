import PlayingTile, { Tile, CharacterTile } from "@/components/PlayingTile";

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
        note="The number on top, 萬 underneath. The small corner number helps you learn the characters."
      >
        {RANKS.map((n) => (
          <PlayingTile key={n} suit="characters" rank={n} />
        ))}
      </Group>

      <Group
        id="suit-dots"
        title="Dots"
        note="Count the circles. Floral centers and clear spacing make the patterns easy to recognize."
      >
        {RANKS.map((n) => (
          <PlayingTile key={n} suit="dots" rank={n} />
        ))}
      </Group>

      <Group
        id="suit-bamboo"
        title="Bamboo"
        note="Count the stalks. One bamboo is a bird, which every set draws differently and none explains."
      >
        {RANKS.map((n) => (
          <PlayingTile key={n} suit="bamboo" rank={n} />
        ))}
      </Group>

      <Group
        id="honours-winds"
        title="Winds"
        note="East, south, west and north. No sequences - winds only ever group with their own kind."
      >
        <CharacterTile name="East wind" bottom="東" ink="#114ba3" />
        <CharacterTile name="South wind" bottom="南" ink="#114ba3" />
        <CharacterTile name="West wind" bottom="西" ink="#114ba3" />
        <CharacterTile name="North wind" bottom="北" ink="#114ba3" />
      </Group>

      <Group
        id="honours-dragons"
        title="Dragons"
        note="Red, green and white. The white dragon is a blank face in some sets and an empty frame in others."
      >
        <CharacterTile name="Red dragon" bottom="中" />
        <CharacterTile name="Green dragon" bottom="發" ink="#236951" />
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
