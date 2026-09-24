import FlowerTile, { SeasonTile } from "@/components/FlowerTile";
import PlayingTile, { Tile, CharacterTile } from "@/components/PlayingTile";
import { BLUE, GREEN } from "@/components/TileArtwork";

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
        <CharacterTile name="East wind" index="E" bottom="東" ink={BLUE} />
        <CharacterTile name="South wind" index="S" bottom="南" ink={BLUE} />
        <CharacterTile name="West wind" index="W" bottom="西" ink={BLUE} />
        <CharacterTile name="North wind" index="N" bottom="北" ink={BLUE} />
      </Group>

      <Group
        id="honours-dragons"
        title="Dragons"
        note="Red, green and white. The white dragon is a blank face in some sets and an empty frame in others."
      >
        <CharacterTile name="Red dragon" bottom="中" />
        <CharacterTile name="Green dragon" bottom="發" ink={GREEN} />
        <Tile name="White dragon">
          {/* A frame with notched corners, like a ticket. */}
          <g fill="none" stroke={BLUE}>
            <path
              strokeWidth="5"
              d="M26 22 H62 Q62 28 68 28 V96 Q62 96 62 102 H26 Q26 96 20 96 V28 Q26 28 26 22 Z"
            />
            <rect x="29" y="33" width="30" height="58" rx="2" strokeWidth="2" />
          </g>
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
        <SeasonTile rank={1} />
        <SeasonTile rank={2} />
        <SeasonTile rank={3} />
        <SeasonTile rank={4} />
      </Group>
    </div>
  );
}
