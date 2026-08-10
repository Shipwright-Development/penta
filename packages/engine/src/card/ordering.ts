import type { Rank, Suit } from '../types/card.js';

// ---------------------------------------------------------------------------
// Suit rankings (value = sort position; lower = weaker)
// ---------------------------------------------------------------------------

/** Standard suit order used by Trump, Hearts, Rumpun, and Seven: ♣ < ♦ < ♥ < ♠ */
export const STANDARD_SUIT_RANK: Record<Suit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
};

/**
 * Capsa Banting suit order: ♦ < ♣ < ♥ < ♠
 * Clubs and diamonds are swapped relative to the standard ordering.
 */
export const CAPSA_SUIT_RANK: Record<Suit, number> = {
  diamonds: 0,
  clubs: 1,
  hearts: 2,
  spades: 3,
};

// ---------------------------------------------------------------------------
// Card rank orderings (value = sort position; lower = weaker)
// ---------------------------------------------------------------------------

/**
 * Standard rank order for trick-taking: 2 < 3 < … < 10 < J < Q < K < A
 * Used by Trump, Hearts, Seven, and Rumpun (for trump determination and
 * trick-winner resolution — not for Rumpun scoring, which uses RUMPUN_CARD_VALUE).
 */
export const STANDARD_CARD_RANK: Record<Rank, number> = {
  2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  J: 9, Q: 10, K: 11, A: 12,
};

/**
 * Capsa Banting rank order: 3 < 4 < … < K < A < 2
 * The 2 is the highest card, unlike in the standard ordering.
 */
export const CAPSA_CARD_RANK: Record<Rank, number> = {
  3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6, 10: 7,
  J: 8, Q: 9, K: 10, A: 11, 2: 12,
};

// ---------------------------------------------------------------------------
// Rumpun scoring values — distinct from card rank
// ---------------------------------------------------------------------------

/**
 * Rumpun card values, used only to compute round scores from won tricks.
 * Do NOT use for trick resolution or trump determination — use STANDARD_CARD_RANK.
 *
 * An Ace beats a 10 in Rumpun tricks (rank 12 > 8), even though a 10 is
 * worth more points (5 > 4). The two tables must never be conflated.
 *
 * Full deck total: 9 points per rank × 4 suits = 36.
 */
export const RUMPUN_CARD_VALUE: Record<Rank, number> = {
  2: 1, 3: 1, 4: 1, 5: 1,
  6: -1, 7: -2, 8: -3, 9: -4,
  10: 5,
  J: 1, Q: 2, K: 3, A: 4,
};

// ---------------------------------------------------------------------------
// Seven scoring
// ---------------------------------------------------------------------------

/**
 * Seven discard values for non-ace cards.
 * Ace value depends on game state — see SEVEN_ACE_VALUE.
 */
export const SEVEN_DISCARD_VALUE: Omit<Record<Rank, number>, 'A'> = {
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 11, Q: 12, K: 13,
};

/** Ace placement convention for a Seven round. */
export type AceConvention = 'under' | 'above' | 'none';

/**
 * Ace discard value under each convention.
 * - 'under': ace went under the 2 (value = 1)
 * - 'above': ace went above the King (value = 14)
 * - 'none':  no ace was placed that round (value = 7 — easy to miss)
 */
export const SEVEN_ACE_VALUE: Record<AceConvention, number> = {
  under: 1,
  above: 14,
  none: 7,
};
