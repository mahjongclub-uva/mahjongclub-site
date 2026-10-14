import FlowerTile, { SeasonTile } from "@/components/FlowerTile";
import PlayingTile, {
  Tile,
  CharacterTile,
  WhiteDragonFace,
} from "@/components/PlayingTile";
import { BLUE, GREEN } from "@/components/TileArtwork";

function Group({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tile-group" aria-labelledby={id}>
      <h3 id={id}>
        {title} <small>{count}</small>
      </h3>
      <ul className="tile-row">{children}</ul>
    </section>
  );
}

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function TileSet() {
  return (
    <div className="tile-set">
      <Group id="suit-characters" count="1–9 · four of each" title="Characters">
        {RANKS.map((n) => (
          <PlayingTile key={n} suit="characters" rank={n} />
        ))}
      </Group>

      <Group id="suit-dots" count="1–9 · four of each" title="Dots">
        {RANKS.map((n) => (
          <PlayingTile key={n} suit="dots" rank={n} />
        ))}
      </Group>

      <Group id="suit-bamboo" count="1–9 · four of each" title="Bamboo">
        {RANKS.map((n) => (
          <PlayingTile key={n} suit="bamboo" rank={n} />
        ))}
      </Group>

      <Group id="honours-winds" count="four of each" title="Winds">
        <CharacterTile name="East wind" index="E" bottom="東" ink={BLUE} />
        <CharacterTile name="South wind" index="S" bottom="南" ink={BLUE} />
        <CharacterTile name="West wind" index="W" bottom="西" ink={BLUE} />
        <CharacterTile name="North wind" index="N" bottom="北" ink={BLUE} />
      </Group>

      <Group id="honours-dragons" count="four of each" title="Dragons">
        <CharacterTile name="Red dragon" bottom="中" />
        <CharacterTile name="Green dragon" bottom="發" ink={GREEN} />
        <Tile name="White dragon">
          <WhiteDragonFace />
        </Tile>
      </Group>

      <Group id="honours-flowers" count="one of each" title="Flowers">
        <FlowerTile rank={1} />
        <FlowerTile rank={2} />
        <FlowerTile rank={3} />
        <FlowerTile rank={4} />
      </Group>
      <Group id="bonus-seasons" count="one of each" title="Seasons">
        <SeasonTile rank={1} />
        <SeasonTile rank={2} />
        <SeasonTile rank={3} />
        <SeasonTile rank={4} />
      </Group>
    </div>
  );
}
