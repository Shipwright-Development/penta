import type { Card, Suit } from '@penta/engine';
import { SUIT_GLYPH } from './theme';

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
