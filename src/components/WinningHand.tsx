import PlayingTile, { type Suit } from "@/components/PlayingTile";

const GROUPS: { label: string; suit: Suit; ranks: number[] }[] = [
  { label: "Pair: two matching tiles", suit: "bamboo", ranks: [2, 2] },
  { label: "Trio: three matching tiles", suit: "bamboo", ranks: [1, 1, 1] },
  { label: "Trio: a run in one suit", suit: "bamboo", ranks: [5, 6, 7] },
  { label: "Trio: three matching tiles", suit: "dots", ranks: [8, 8, 8] },
  { label: "Trio: a run in one suit", suit: "characters", ranks: [2, 3, 4] },
];

export default function WinningHand() {
  return (
    <figure className="winning-hand">
      <figcaption>
        <strong>Four trios + one pair</strong>
        <span>
          A 14-tile example, grouped so you can see how the pieces fit.
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
