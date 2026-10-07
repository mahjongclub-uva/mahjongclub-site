export const SEATS = ["You", "Right player", "Across player", "Left player"];
export const wallSeat = (total: number) => (total - 1) % 4;
export type Call = "Pung" | "Chow" | "Pass";
type Suit = "bamboo" | "dots" | "characters";
export type Tile = { suit: Suit; rank: number };

const SUITS: Suit[] = ["bamboo", "dots", "characters"];
type Rand = () => number;
const pick = <T>(items: readonly T[], rand: Rand) =>
  items[Math.floor(rand() * items.length)];
const otherTile = (suit: Suit, rand: Rand): Tile => ({
  suit: pick(
    SUITS.filter((s) => s !== suit),
    rand,
  ),
  rank: 1 + Math.floor(rand() * 9),
});

export type CallScenario = {
  suit: Suit;
  ranks: number[];
  discard: number;
  from: string;
  call: Call;
  hint: string;
  reason: string;
  /** The tile thrown away after a successful claim, never from the claimed suit. */
  after: Tile;
};

/** Fixed so the static HTML and the first client render agree. */
export const FIRST_CALL: CallScenario = {
  suit: "dots",
  ranks: [8, 8],
  discard: 8,
  from: "Across player",
  call: "Pung",
  hint: "Look for two tiles identical to the discard.",
  reason:
    "Your two 8 dots and this discard make three of a kind. You can pung from any player.",
  after: { suit: "characters", rank: 2 },
};

export function makeCallScenario(rand: Rand = Math.random): CallScenario {
  const call = pick(["Pung", "Chow", "Pass"] as const, rand);
  const suit = pick(SUITS, rand);
  const after = otherTile(suit, rand);
  if (call === "Pung") {
    const rank = 1 + Math.floor(rand() * 9);
    return {
      suit,
      ranks: [rank, rank],
      discard: rank,
      from: pick(SEATS.slice(1), rand),
      call,
      hint: "Look for two tiles identical to the discard.",
      reason: `Your two ${rank} ${suit} and this discard make three of a kind. You can pung from any player.`,
      after,
    };
  }
  const start = 1 + Math.floor(rand() * 7);
  const run = [start, start + 1, start + 2];
  const discard = pick(run, rand);
  const runName = `${run.join(", ")} ${suit}`;
  return {
    suit,
    ranks: run.filter((rank) => rank !== discard),
    discard,
    from:
      call === "Chow"
        ? "Left player"
        : pick(["Right player", "Across player"], rand),
    call,
    hint:
      call === "Chow"
        ? "Check the sequence, then check who discarded."
        : "A sequence alone is not enough. Who discarded the tile?",
    reason:
      call === "Chow"
        ? `${runName} form a sequence. The discard is from your left, so you can chow.`
        : `${runName} could form a sequence, but you can only chow a discard from your left. You cannot pung with these tiles either, so pass.`,
    after,
  };
}

export function callFeedback(scenario: CallScenario, choice: Call) {
  if (choice === "Pass" && scenario.call !== "Pass") {
    return `Passing is allowed. You could also call ${scenario.call.toLowerCase()}. ${scenario.reason}`;
  }
  return choice === scenario.call
    ? `That's right. ${scenario.reason}`
    : `Not quite. ${scenario.hint}`;
}

/** A turn's hand: a run whose third tile is the draw, then one odd tile out. */
export const FIRST_TURN: Tile[] = [
  { suit: "bamboo", rank: 5 },
  { suit: "bamboo", rank: 6 },
  { suit: "bamboo", rank: 7 },
  { suit: "characters", rank: 2 },
];

export function makeTurnHand(rand: Rand = Math.random): Tile[] {
  const suit = pick(SUITS, rand);
  const start = 1 + Math.floor(rand() * 7);
  return [
    { suit, rank: start },
    { suit, rank: start + 1 },
    { suit, rank: start + 2 },
    otherTile(suit, rand),
  ];
}
