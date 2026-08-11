import type { Card, Suit } from '@penta/engine';
import { STANDARD_CARD_RANK, STANDARD_SUIT_RANK } from '@penta/engine';
import { SUIT_GLYPH } from './theme';

export type SortMode = 'suit' | 'rank';

/** A display-sorted copy of a hand — grouped by suit or ordered by rank. */
export function sortHand(cards: readonly Card[], mode: SortMode): Card[] {
  const bySuit = (a: Card, b: Card) =>
    STANDARD_SUIT_RANK[a.suit] - STANDARD_SUIT_RANK[b.suit] ||
    STANDARD_CARD_RANK[a.rank] - STANDARD_CARD_RANK[b.rank];
  const byRank = (a: Card, b: Card) =>
    STANDARD_CARD_RANK[a.rank] - STANDARD_CARD_RANK[b.rank] ||
    STANDARD_SUIT_RANK[a.suit] - STANDARD_SUIT_RANK[b.suit];
  return [...cards].sort(mode === 'suit' ? bySuit : byRank);
}

export function suitGlyph(suit: Suit): string {
  return SUIT_GLYPH[suit];
}

/** Compact text form of a card, e.g. "10♠" or "Q♥". */
export function cardText(card: Card): string {
  return `${card.rank}${SUIT_GLYPH[card.suit]}`;
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}
