import type { Card, Suit } from '@penta/engine';
import {
  STANDARD_CARD_RANK,
  STANDARD_SUIT_RANK,
  CAPSA_CARD_RANK,
  CAPSA_SUIT_RANK,
} from '@penta/engine';
import { SUIT_GLYPH } from './theme';

export type SortMode = 'suit' | 'rank';

/**
 * A display-sorted copy of a hand — grouped by suit or ordered by rank. Capsa
 * uses its own orderings (2 is the highest card, ♦<♣<♥<♠).
 */
export function sortHand(cards: readonly Card[], mode: SortMode, capsa = false): Card[] {
  const rankOf = capsa ? CAPSA_CARD_RANK : STANDARD_CARD_RANK;
  const suitOf = capsa ? CAPSA_SUIT_RANK : STANDARD_SUIT_RANK;
  const bySuit = (a: Card, b: Card) =>
    suitOf[a.suit] - suitOf[b.suit] || rankOf[a.rank] - rankOf[b.rank];
  const byRank = (a: Card, b: Card) =>
    rankOf[a.rank] - rankOf[b.rank] || suitOf[a.suit] - suitOf[b.suit];
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
