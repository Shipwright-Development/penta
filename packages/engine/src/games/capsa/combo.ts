import type { Card, Rank } from '../../types/card';
import { CAPSA_CARD_RANK, CAPSA_SUIT_RANK } from '../../card/ordering';

/**
 * Capsa Banting combinations. Only singles, pairs, and 5-card hands are legal
 * (no standalone triples or fours). Ranking uses the Capsa orderings — card
 * rank 3<…<A<2 and suit ♦<♣<♥<♠. Bombs (four-of-a-kind+kicker, straight flush,
 * royal flush) are stoppers, playable any turn and beaten only by higher bombs.
 */
export type ComboType =
  'single' | 'pair' | 'straight' | 'flush' | 'fullhouse' | 'four' | 'straightflush' | 'royalflush';

export interface Combo {
  type: ComboType;
  cards: Card[];
  size: 1 | 2 | 5;
  isBomb: boolean;
}

/** 5-card hierarchy, low → high. Bombs sit above the non-bombs. */
const FIVE_ORDER: Record<string, number> = {
  straight: 0,
  flush: 1,
  fullhouse: 2,
  four: 3,
  straightflush: 4,
  royalflush: 5,
};

/**
 * The 11 legal straights, by their rank set, each with a strength (low → high)
 * and the "high" card that judges it. A and 2 may sit low (A-2-3-4-5) or the run
 * may end J-Q-K-A-2; no wraparound (K-A-2-3-4 is not here).
 */
const STRAIGHTS: { set: Rank[]; strength: number; high: Rank }[] = [
  { set: ['A', 2, 3, 4, 5], strength: 0, high: 5 },
  { set: [2, 3, 4, 5, 6], strength: 1, high: 6 },
  { set: [3, 4, 5, 6, 7], strength: 2, high: 7 },
  { set: [4, 5, 6, 7, 8], strength: 3, high: 8 },
  { set: [5, 6, 7, 8, 9], strength: 4, high: 9 },
  { set: [6, 7, 8, 9, 10], strength: 5, high: 10 },
  { set: [7, 8, 9, 10, 'J'], strength: 6, high: 'J' },
  { set: [8, 9, 10, 'J', 'Q'], strength: 7, high: 'Q' },
  { set: [9, 10, 'J', 'Q', 'K'], strength: 8, high: 'K' },
  { set: [10, 'J', 'Q', 'K', 'A'], strength: 9, high: 'A' },
  { set: ['J', 'Q', 'K', 'A', 2], strength: 10, high: 2 },
];

function straightMatch(cards: Card[]): { strength: number; high: Rank } | null {
  const ranks = new Set(cards.map((c) => c.rank));
  if (ranks.size !== 5) return null;
  for (const s of STRAIGHTS) {
    if (s.set.every((r) => ranks.has(r))) return { strength: s.strength, high: s.high };
  }
  return null;
}

function rankCounts(cards: Card[]): Map<Rank, number> {
  const m = new Map<Rank, number>();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  return m;
}

function rankWithCount(cards: Card[], count: number): Rank {
  for (const [rank, n] of rankCounts(cards)) if (n === count) return rank;
  throw new Error('no rank with that count');
}

function compareCard(a: Card, b: Card): number {
  const r = CAPSA_CARD_RANK[a.rank] - CAPSA_CARD_RANK[b.rank];
  return r !== 0 ? r : CAPSA_SUIT_RANK[a.suit] - CAPSA_SUIT_RANK[b.suit];
}

function highestByRank(cards: Card[]): Card {
  return cards.reduce((hi, c) => (compareCard(c, hi) > 0 ? c : hi));
}

/** Classify 5/2/1 cards into a combo, or null if they form no legal play. */
export function classify(cards: Card[]): Combo | null {
  const n = cards.length;
  if (n === 1) return { type: 'single', cards, size: 1, isBomb: false };
  if (n === 2) {
    return cards[0].rank === cards[1].rank ? { type: 'pair', cards, size: 2, isBomb: false } : null;
  }
  if (n !== 5) return null; // 3- and 4-card plays are never legal

  const counts = [...rankCounts(cards).values()].sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const straight = straightMatch(cards);

  if (counts[0] === 4) return { type: 'four', cards, size: 5, isBomb: true };
  if (counts[0] === 3 && counts[1] === 2) {
    return { type: 'fullhouse', cards, size: 5, isBomb: false };
  }
  if (straight && flush) {
    const royal = straight.strength === 9; // 10-J-Q-K-A suited
    return { type: royal ? 'royalflush' : 'straightflush', cards, size: 5, isBomb: true };
  }
  if (flush) return { type: 'flush', cards, size: 5, isBomb: false };
  if (straight) return { type: 'straight', cards, size: 5, isBomb: false };
  return null;
}

/** Lexicographic ranking key for a 5-card combo (used for same-group compares). */
function fiveKey(combo: Combo): [number, number, number] {
  const type = FIVE_ORDER[combo.type];
  switch (combo.type) {
    case 'straight':
    case 'straightflush': {
      const m = straightMatch(combo.cards);
      const top = combo.cards.find((c) => c.rank === m?.high);
      return [type, m?.strength ?? 0, top ? CAPSA_SUIT_RANK[top.suit] : 0];
    }
    case 'flush': {
      const top = highestByRank(combo.cards);
      return [type, CAPSA_CARD_RANK[top.rank], CAPSA_SUIT_RANK[top.suit]];
    }
    case 'fullhouse':
      return [type, CAPSA_CARD_RANK[rankWithCount(combo.cards, 3)], 0];
    case 'four':
      return [type, CAPSA_CARD_RANK[rankWithCount(combo.cards, 4)], 0];
    case 'royalflush':
      return [type, 0, CAPSA_SUIT_RANK[highestByRank(combo.cards).suit]];
    default:
      return [type, 0, 0];
  }
}

function compareFive(a: Combo, b: Combo): number {
  const ka = fiveKey(a);
  const kb = fiveKey(b);
  for (let i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return 0;
}

function pairBeats(cand: Combo, curr: Combo): boolean {
  const cr = CAPSA_CARD_RANK[cand.cards[0].rank];
  const ur = CAPSA_CARD_RANK[curr.cards[0].rank];
  if (cr !== ur) return cr > ur;
  const cs = Math.max(...cand.cards.map((c) => CAPSA_SUIT_RANK[c.suit]));
  const us = Math.max(...curr.cards.map((c) => CAPSA_SUIT_RANK[c.suit]));
  return cs > us;
}

/**
 * Whether `cand` legally beats `curr`. Bombs beat any non-bomb regardless of
 * size; bomb-vs-bomb and normal same-size plays compare within their group.
 * The royal flush tops every straight flush — including a suited J-Q-K-A-2 that
 * would beat 10-J-Q-K-A as an ordinary straight — because it's a higher bomb.
 */
export function beats(cand: Combo, curr: Combo): boolean {
  if (cand.isBomb && !curr.isBomb) return true;
  if (!cand.isBomb && curr.isBomb) return false;
  if (cand.isBomb && curr.isBomb) return compareFive(cand, curr) > 0;

  if (cand.size !== curr.size) return false;
  if (cand.size === 1) return compareCard(cand.cards[0], curr.cards[0]) > 0;
  if (cand.size === 2) return pairBeats(cand, curr);
  return compareFive(cand, curr) > 0;
}

function* combinations(cards: Card[], k: number): Generator<Card[]> {
  const n = cards.length;
  if (k > n) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    yield idx.map((i) => cards[i]);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

/** Every legal combo playable from a hand: singles, pairs, and 5-card hands. */
export function allCombos(hand: Card[]): Combo[] {
  const combos: Combo[] = [];
  for (const c of hand) combos.push(classify([c])!);
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (hand[i].rank === hand[j].rank) combos.push(classify([hand[i], hand[j]])!);
    }
  }
  for (const five of combinations(hand, 5)) {
    const combo = classify(five);
    if (combo) combos.push(combo);
  }
  return combos;
}
