export const SEATS = ["You", "Right player", "Across player", "Left player"];
/** The seat whose wall a roll lands on, counting counterclockwise from the dealer as 1. */
export const wallSeat = (total: number, dealer = 0) => (dealer + total - 1) % 4;
export type Suit = "bamboo" | "dots" | "characters";
/** At the club, winds and dragons are set aside like flowers and seasons. */
export type Bonus = "flower" | "season" | "wind" | "dragon";
export type Piece = { suit: Suit | Bonus; rank: number };
export type Call = "Win" | "Pung" | "Kong" | "Chow" | "Pass";
export const CALLS: Call[] = ["Win", "Pung", "Kong", "Chow", "Pass"];
/** Seats as SEATS numbers them: 1 right, 2 across, 3 left. */
export type Seat = 1 | 2 | 3;
export const LEFT: Seat = 3;

const SUITS: Suit[] = ["characters", "dots", "bamboo"];
const BONUS_NAMES: Record<Bonus, string[]> = {
  flower: ["Plum", "Orchid", "Chrysanthemum", "Bamboo"].map(
    (n) => `${n} flower`,
  ),
  season: ["Spring", "Summer", "Autumn", "Winter"],
  wind: ["East", "South", "West", "North"].map((n) => `${n} wind`),
  dragon: ["Red", "Green", "White"].map((n) => `${n} dragon`),
};
const isSuit = (suit: Piece["suit"]): suit is Suit =>
  (SUITS as string[]).includes(suit);
export const pieceName = ({ suit, rank }: Piece) =>
  isSuit(suit) ? `${rank} ${suit}` : BONUS_NAMES[suit][rank - 1];

type Rand = () => number;
const pick = <T>(items: readonly T[], rand: Rand) =>
  items[Math.floor(rand() * items.length)];
const same = (a: Piece, b: Piece) => a.suit === b.suit && a.rank === b.rank;
export const sortHand = (tiles: Piece[]) =>
  [...tiles].sort(
    (a, b) =>
      SUITS.indexOf(a.suit as Suit) - SUITS.indexOf(b.suit as Suit) ||
      a.rank - b.rank,
  );
const tooMany = (tiles: Piece[]) =>
  tiles.some((t) => tiles.filter((x) => same(x, t)).length > 4);

/** Does this pile split into sets of three (pungs or runs) and nothing else? */
function allSets(tiles: Piece[]): boolean {
  if (!tiles.length) return true;
  const [first, ...rest] = sortHand(tiles);
  const without = (pile: Piece[], t: Piece) => {
    const i = pile.findIndex((x) => same(x, t));
    return i < 0 ? null : [...pile.slice(0, i), ...pile.slice(i + 1)];
  };
  const pung = without(rest, first);
  const pung2 = pung && without(pung, first);
  if (pung2 && allSets(pung2)) return true;
  const two = without(rest, { ...first, rank: first.rank + 1 });
  const three = two && without(two, { ...first, rank: first.rank + 2 });
  return !!three && allSets(three);
}

/** Seventeen tiles that make five sets and a pair. */
export function isWin(tiles: Piece[]) {
  if (tiles.length !== 17) return false;
  return tiles.some((t, i) => {
    const j = tiles.findIndex((x, n) => n !== i && same(x, t));
    return j >= 0 && allSets(tiles.filter((_, n) => n !== i && n !== j));
  });
}

/** Every call the rules allow on this discard, Pass always among them. */
export function legalCalls(hand: Piece[], discard: Piece, from: Seat): Call[] {
  const held = hand.filter((t) => same(t, discard)).length;
  const has = (rank: number) =>
    hand.some((t) => t.suit === discard.suit && t.rank === rank);
  const r = discard.rank;
  const chow =
    from === LEFT &&
    ((has(r - 2) && has(r - 1)) ||
      (has(r - 1) && has(r + 1)) ||
      (has(r + 1) && has(r + 2)));
  return CALLS.filter(
    (call) =>
      (call === "Win" && isWin([...hand, discard])) ||
      (call === "Pung" && held >= 2) ||
      (call === "Kong" && held >= 3) ||
      (call === "Chow" && chow) ||
      call === "Pass",
  );
}

const randomTile = (rand: Rand, suits = SUITS): Piece => ({
  suit: pick(suits, rand),
  rank: 1 + Math.floor(rand() * 9),
});
function randomSet(rand: Rand, suits = SUITS): Piece[] {
  const t = randomTile(rand, suits);
  if (rand() < 0.4) return [t, t, t];
  const start = 1 + Math.floor(rand() * 7);
  return [0, 1, 2].map((n) => ({ suit: t.suit, rank: start + n }));
}
/** Sets and a pair: the part of a hand that stays put. */
function core(sets: number, rand: Rand, suits = SUITS) {
  const tiles: Piece[] = [];
  for (let n = 0; n < sets; n++) tiles.push(...randomSet(rand, suits));
  const pair = randomTile(rand, suits);
  return [...tiles, pair, pair];
}
const indexIn = (hand: Piece[], tiles: Piece[]) => {
  const out: number[] = [];
  for (const t of tiles)
    out.push(hand.findIndex((x, n) => same(x, t) && !out.includes(n)));
  return out;
};

export type CallRound = {
  from: Seat;
  discard: Piece;
  hand: Piece[];
  /** Hand tiles that go with the discard, by index in the sorted hand. */
  uses: number[];
  /** Tiles in no set, by index: what you throw after a claim. */
  loose: number[];
  /** After a kong, the replacement from the flower side. */
  replacement?: Piece;
  answer: Call;
  /** Another player shouting for the same tile. */
  rival?: Seat;
  why: string;
};

const KINDS = ["Pung", "Chow", "Pass", "Kong", "Win"] as const;
type RoundKind = (typeof KINDS)[number];
const otherSeat = (not: Seat, rand: Rand) =>
  pick(
    ([1, 2, 3] as Seat[]).filter((s) => s !== not),
    rand,
  );

/** One round of a kind: random tiles and seats, rerolled until only the intended calls are legal. */
export function makeCallRound(
  kind: RoundKind,
  rand: Rand = Math.random,
): CallRound {
  for (;;) {
    let tile = randomTile(rand);
    let keyTiles: Piece[];
    let from: Seat;
    if (kind === "Chow" || kind === "Pass" || kind === "Win") {
      const start = 1 + Math.floor(rand() * 7);
      const run = [0, 1, 2].map((n) => ({ suit: tile.suit, rank: start + n }));
      const gap = Math.floor(rand() * 3);
      tile = run[gap];
      keyTiles = run.filter((_, n) => n !== gap);
      from = kind === "Chow" ? LEFT : pick([1, 2] as Seat[], rand);
    } else {
      keyTiles = kind === "Kong" ? [tile, tile, tile] : [tile, tile];
      from = pick([1, 2, 3] as Seat[], rand);
    }
    // Win: four sets and a pair around the open run. Otherwise three sets, a
    // pair and loose tiles, so the hand is never one tile from winning.
    const kept = core(kind === "Win" ? 4 : 3, rand);
    const loose: Piece[] = [];
    while (kept.length + keyTiles.length + loose.length < 16)
      loose.push(randomTile(rand));
    const hand = sortHand([...kept, ...keyTiles, ...loose]);
    const replacement = kind === "Kong" ? randomTile(rand) : undefined;
    const all = [...hand, tile, ...(replacement ? [replacement] : [])];
    if (tooMany(all)) continue;
    const legal = legalCalls(hand, tile, from);
    const want: Call[] =
      kind === "Pass"
        ? ["Pass"]
        : kind === "Kong"
          ? ["Pung", "Kong", "Pass"]
          : [kind, "Pass"];
    if (legal.join() !== CALLS.filter((c) => want.includes(c)).join()) continue;
    const uses = indexIn(hand, keyTiles);
    const rival =
      kind === "Win" || (kind === "Chow" && rand() < 0.5)
        ? otherSeat(from, rand)
        : undefined;
    const why =
      kind === "Pung"
        ? `Two ${pieceName(tile)} in your hand and this one: three alike.`
        : kind === "Kong"
          ? "Three in your hand and this one: four alike. A kong draws a replacement from the flower side."
          : kind === "Pass"
            ? "A chow only comes from the player on your left. Let it go."
            : kind === "Win"
              ? "That finishes your hand: five sets and a pair. A win beats a pung."
              : rival
                ? "A run from your left, but a pung beats a chow, so they take it."
                : "A run, from the player on your left.";
    return {
      from,
      discard: tile,
      hand,
      uses,
      loose: indexIn(hand, loose).filter((i) => !uses.includes(i)),
      replacement,
      answer: kind,
      rival,
      why,
    };
  }
}

/** Five rounds, one of each kind, in a random order. */
export function makeCallRounds(rand: Rand = Math.random): CallRound[] {
  const kinds = [...KINDS];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds.map((kind) => makeCallRound(kind, rand));
}

/** A fixed sequence, so the static HTML and the first client render agree. */
export function seeded(seed: number): Rand {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One short line for a pick that isn't this round's answer. */
export function callNudge(round: CallRound, call: Call) {
  const legal = legalCalls(round.hand, round.discard, round.from);
  if (call === "Pass") return "You can claim this one. Look at your hand.";
  if (legal.includes(call)) return "You can, but you hold three. Make it four.";
  if (call === "Win") return "Your hand isn't one tile from done.";
  if (call === "Chow")
    return round.from === LEFT
      ? "A chow needs the tiles on either side, in one suit."
      : "A chow only comes from the player on your left.";
  return call === "Kong"
    ? "A kong needs three of this tile in your hand."
    : "A pung needs two of this tile in your hand.";
}

/* The turn game: three turns, ending on a self-drawn win. */
export type TurnScript = {
  /** Four sets and a pair, sorted. They stay put all game. */
  kept: Piece[];
  /** Two tiles toward a run; the second is turn one's draw. */
  partial: [Piece, Piece];
  /** The tile to throw on turns one and two. */
  odd: [Piece, Piece];
  /** Turn two's bonus draws: one, or two when the replacement is another. */
  bonus: Piece[];
  /** Turn three's draw, which finishes the hand. */
  win: Piece;
};

const BONUS: Bonus[] = ["flower", "season", "wind", "dragon"];
const randomBonus = (rand: Rand): Piece => {
  const suit = pick(BONUS, rand);
  return {
    suit,
    rank: 1 + Math.floor(rand() * BONUS_NAMES[suit].length),
  };
};

export function makeTurnScript(rand: Rand = Math.random): TurnScript {
  for (;;) {
    // The hand lives in two suits; the tiles to throw come from the third,
    // three or more apart, so each has nothing near it.
    const oddSuit = pick(SUITS, rand);
    const handSuits = SUITS.filter((x) => x !== oddSuit);
    const kept = sortHand(core(4, rand, handSuits));
    const start = 2 + Math.floor(rand() * 6);
    const suit = pick(handSuits, rand);
    const partial: [Piece, Piece] = [
      { suit, rank: start },
      { suit, rank: start + 1 },
    ];
    const win = { suit, rank: rand() < 0.5 ? start - 1 : start + 2 };
    const odd1 = { suit: oddSuit, rank: 1 + Math.floor(rand() * 9) };
    const odd2 = { suit: oddSuit, rank: 1 + Math.floor(rand() * 9) };
    if (Math.abs(odd1.rank - odd2.rank) < 3) continue;
    const first = randomBonus(rand);
    let second = randomBonus(rand);
    while (same(second, first)) second = randomBonus(rand);
    const bonus = rand() < 0.4 ? [first, second] : [first];
    const all = [...kept, ...partial, odd1, odd2, win];
    if (tooMany(all)) continue;
    if (!isWin([...kept, ...partial, win])) continue;
    if (
      isWin([...kept, ...partial, odd1]) ||
      isWin([...kept, ...partial, odd2])
    )
      continue;
    return { kept, partial, odd: [odd1, odd2], bonus, win };
  }
}
