import PlayingTile, { type Suit } from "@/components/PlayingTile";

const GROUPS: {
  kind: "Pair" | "Pung" | "Chow";
  suit: Suit;
  ranks: number[];
}[] = [
  { kind: "Pair", suit: "bamboo", ranks: [2, 2] },
  { kind: "Pung", suit: "bamboo", ranks: [1, 1, 1] },
  { kind: "Chow", suit: "bamboo", ranks: [5, 6, 7] },
  { kind: "Pung", suit: "dots", ranks: [8, 8, 8] },
  { kind: "Chow", suit: "characters", ranks: [2, 3, 4] },
  { kind: "Pung", suit: "dots", ranks: [3, 3, 3] },
];
const MEANS = { Pair: "two alike", Pung: "three alike", Chow: "a run" };

export default function WinningHand() {
  return (
    <figure className="winning-hand">
      <figcaption>
        <span>One example</span> Five sets and a pair
      </figcaption>
      <div className="hand-groups">
        {GROUPS.map((group, i) => (
          <div className="hand-group" key={i}>
            <ul
              className="tile-row"
              aria-label={`${group.kind}: ${MEANS[group.kind]}`}
            >
              {group.ranks.map((rank, j) => (
                <PlayingTile key={j} suit={group.suit} rank={rank} />
              ))}
            </ul>
            <p aria-hidden="true">
              <b data-kind={group.kind}>{group.kind}</b> {MEANS[group.kind]}
            </p>
          </div>
        ))}
      </div>
    </figure>
  );
}
