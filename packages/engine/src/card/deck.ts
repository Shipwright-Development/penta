import type { Card, Suit, Rank, PlayerId } from '../types/card';
import type { Rng } from '../rng';

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

/** All 52 cards in an unspecified but consistent order. */
export const STANDARD_DECK: readonly Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({ suit, rank })),
);

/**
 * Fisher-Yates shuffle. Returns a new array; input is unchanged. Takes an
 * injectable Rng so a shuffle can be replayed from a seed (defaults to
 * Math.random for production use).
 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]] as [T, T];
  }
  return arr;
}

/**
 * The middle card's counting value for the first-card rule: A = 1, J = 11,
 * Q = 12, K = 13, numbers = face value. See penta.md, Dealing.
 */
export function middleCardValue(card: Card): number {
  switch (card.rank) {
    case 'A':
      return 1;
    case 'J':
      return 11;
    case 'Q':
      return 12;
    case 'K':
      return 13;
    default:
      return card.rank;
  }
}

/**
 * Who receives the first card, per the first-card rule: count clockwise from
 * the dealer as 1, wrapping, by the middle card's value. So value 1 (or 5, 9,
 * K) lands back on the dealer.
 */
export function firstCardRecipient(dealer: PlayerId, middleCard: Card): PlayerId {
  return ((((dealer + middleCardValue(middleCard) - 1) % 4) + 4) % 4) as PlayerId;
}

/**
 * Deal all 52 cards one at a time, clockwise, starting from firstRecipient.
 * Each seat receives 13.
 */
export function dealClockwise(
  deck: readonly Card[],
  firstRecipient: PlayerId,
): Record<PlayerId, Card[]> {
  const hands: Record<PlayerId, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
  for (let i = 0; i < deck.length; i++) {
    const seat = ((firstRecipient + i) % 4) as PlayerId;
    hands[seat].push(deck[i]);
  }
  return hands;
}

export interface DealOutcome {
  hands: Record<PlayerId, Card[]>;
  middleCard: Card;
  firstRecipient: PlayerId;
  /** How many times the deal was redealt to satisfy isValid (Trump). */
  reshuffles: number;
}

/**
 * The full dealing ritual for one game: shuffle, flip the middle card, work out
 * the first recipient, and deal clockwise. If isValid is supplied (Trump's
 * every-hand-has-all-four-suits check) and fails, reshuffle and redeal.
 */
export function dealForGame(
  dealer: PlayerId,
  rng: Rng = Math.random,
  isValid?: (hands: Record<PlayerId, Card[]>) => boolean,
): DealOutcome {
  let reshuffles = 0;
  for (;;) {
    const deck = shuffle(STANDARD_DECK, rng);
    const middleCard = deck[Math.floor(deck.length / 2)];
    const firstRecipient = firstCardRecipient(dealer, middleCard);
    const hands = dealClockwise(deck, firstRecipient);
    if (!isValid || isValid(hands)) {
      return { hands, middleCard, firstRecipient, reshuffles };
    }
    reshuffles++;
  }
}
