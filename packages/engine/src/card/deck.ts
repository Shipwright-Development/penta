import type { Card, Suit, Rank } from '../types/card.js';

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

/** All 52 cards in an unspecified but consistent order. */
export const STANDARD_DECK: readonly Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({ suit, rank })),
);

/** Fisher-Yates shuffle. Returns a new array; input is unchanged. */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]] as [T, T];
  }
  return arr;
}

/** Deal a shuffled deck into four equal hands of 13. */
export function deal(deck: readonly Card[]): [Card[], Card[], Card[], Card[]] {
  const shuffled = shuffle(deck);
  return [
    shuffled.slice(0, 13),
    shuffled.slice(13, 26),
    shuffled.slice(26, 39),
    shuffled.slice(39, 52),
  ];
}
