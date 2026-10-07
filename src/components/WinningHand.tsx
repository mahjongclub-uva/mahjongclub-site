import PlayingTile, { type Suit } from "@/components/PlayingTile";

const GROUPS: { label: string; suit: Suit; ranks: number[] }[] = [
  { label: "Pair: two matching tiles", suit: "bamboo", ranks: [2, 2] },
  {
    label: "Pung: three matching tiles",
    suit: "bamboo",
    ranks: [1, 1, 1],
  },
  { label: "Chow: a run in one suit", suit: "bamboo", ranks: [5, 6, 7] },
  {
    label: "Pung: three matching tiles",
    suit: "dots",
    ranks: [8, 8, 8],
  },
  {
    label: "Chow: a run in one suit",
    suit: "characters",
    ranks: [2, 3, 4],
  },
  {
    label: "Pung: three matching tiles",
    suit: "dots",
    ranks: [3, 3, 3],
  },
];

export default function WinningHand() {
  return (
    <figure className="winning-hand">
      <figcaption>
        <strong>One example: five sets + one pair</strong>
        <span>This is only one way to win!</span>
      </figcaption>
      <div className="hand-groups">
        {GROUPS.map((group, i) => (
          <div className="hand-group" key={i}>
            <ul className="tile-row" aria-label={group.label}>
              {group.ranks.map((rank, j) => (
                <PlayingTile key={j} suit={group.suit} rank={rank} />
              ))}
            </ul>
            <p>{group.label}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}
