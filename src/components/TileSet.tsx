import FlowerTile from "@/components/FlowerTile";
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
        note="Count the circles. Once you spot the pattern, you’ll recognize these at a glance."
      >
        {RANKS.map((n) => (
          <PlayingTile key={n} suit="dots" rank={n} />
        ))}
      </Group>

      <Group
        id="suit-bamboo"
        title="Bamboo"
        note="Count the stalks, with one exception: the bird is one bamboo. It likes to do things its own way."
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
        title="Flowers"
        note="Plum, orchid, chrysanthemum and bamboo. These optional bonus tiles are set aside when drawn; designs and numbering can vary by set."
      >
        <FlowerTile rank={1} />
        <FlowerTile rank={2} />
        <FlowerTile rank={3} />
        <FlowerTile rank={4} />
      </Group>
      <Group
        id="bonus-seasons"
        title="Seasons"
        note="Spring, summer, autumn and winter form a second set of four bonus tiles. Their use depends on the rules at your table."
      >
        <CharacterTile
          name="Spring season"
          rank={1}
          ink="#114ba3"
          bottom="春"
        />
        <CharacterTile
          name="Summer season"
          rank={2}
          ink="#114ba3"
          bottom="夏"
        />
        <CharacterTile
          name="Autumn season"
          rank={3}
          ink="#114ba3"
          bottom="秋"
        />
        <CharacterTile
          name="Winter season"
          rank={4}
          ink="#114ba3"
          bottom="冬"
        />
      </Group>
    </div>
  );
}
