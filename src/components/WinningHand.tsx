import PlayingTile, { type Suit } from "@/components/PlayingTile";

const GROUPS: { label: string; suit: Suit; ranks: number[] }[] = [
  { label: "Pair: two matching tiles", suit: "bamboo", ranks: [2, 2] },
  {
    label: "Pung / pong / peng: three matching tiles",
    suit: "bamboo",
    ranks: [1, 1, 1],
  },
  { label: "Chow / chi: a run in one suit", suit: "bamboo", ranks: [5, 6, 7] },
  {
    label: "Pung / pong / peng: three matching tiles",
    suit: "dots",
    ranks: [8, 8, 8],
  },
  {
    label: "Chow / chi: a run in one suit",
    suit: "characters",
    ranks: [2, 3, 4],
  },
  {
    label: "Pung / pong / peng: three matching tiles",
    suit: "dots",
    ranks: [3, 3, 3],
  },
];

export default function WinningHand() {
  return (
    <figure className="winning-hand">
      <figcaption>
        <strong>One example: five sets + one pair</strong>
        <span>
          This 17-tile example shows one way to win, not the only combination.
          Look for five three-tile sets and a matching pair.
        </span>
      </figcaption>
      <div className="hand-groups">
        {GROUPS.map((group, i) => (
          <div
            className={i === 0 ? "hand-group hand-pair" : "hand-group"}
            key={i}
          >
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
