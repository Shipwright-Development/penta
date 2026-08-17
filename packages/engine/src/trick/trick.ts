import type { Card, Suit, PlayerId } from '../types/card';
import { STANDARD_CARD_RANK } from '../card/ordering';

/**
 * Shared trick-taking core, used by Trump, Hearts, and Rumpun. Each game
 * parameterizes it: whether there's a trump suit, which suit is restricted from
 * leading until "broken", and (for Rumpun) which cards are playable. Trick
 * resolution uses card *rank* (2→A) — Rumpun's scoring values never enter here.
 */

export interface PlayedCard {
  player: PlayerId;
  card: Card;
  /**
   * True when this card is laid face down for the other players (a trump
   * played from hand, in Trump and Rumpun). A display concern only — it never
   * affects trick resolution. Revealed once the trick is complete.
   */
  faceDown?: boolean;
}

export interface TrickState {
  leader: PlayerId;
  plays: PlayedCard[];
}

export function newTrick(leader: PlayerId): TrickState {
  return { leader, plays: [] };
}

export function ledSuit(trick: TrickState): Suit | null {
  return trick.plays.length > 0 ? trick.plays[0].card.suit : null;
}

export function nextToPlay(trick: TrickState): PlayerId {
  return ((trick.leader + trick.plays.length) % 4) as PlayerId;
}

export function isTrickComplete(trick: TrickState): boolean {
  return trick.plays.length === 4;
}

/** Whether `candidate` takes the lead from `current`, given led suit and trump. */
function beats(candidate: Card, current: Card, led: Suit, trump: Suit | null): boolean {
  const candTrump = trump !== null && candidate.suit === trump;
  const currTrump = trump !== null && current.suit === trump;
  if (candTrump !== currTrump) return candTrump; // any trump beats any non-trump
  if (candTrump && currTrump) {
    return STANDARD_CARD_RANK[candidate.rank] > STANDARD_CARD_RANK[current.rank];
  }
  const candLed = candidate.suit === led;
  const currLed = current.suit === led;
  if (candLed !== currLed) return candLed; // led suit beats off-suit
  if (candLed && currLed) {
    return STANDARD_CARD_RANK[candidate.rank] > STANDARD_CARD_RANK[current.rank];
  }
  return false; // both off-suit non-trump: a dump, cannot take the trick
}

/**
 * The winning seat of a completed (or in-progress) trick. Highest trump wins;
 * otherwise the highest card of the led suit. Off-suit non-trump cards (dumps)
 * never win — which is exactly Rumpun's dump rule.
 */
export function trickWinner(trick: TrickState, trump: Suit | null): PlayerId {
  const led = trick.plays[0].card.suit;
  let best = trick.plays[0];
  for (let i = 1; i < trick.plays.length; i++) {
    if (beats(trick.plays[i].card, best.card, led, trump)) best = trick.plays[i];
  }
  return best.player;
}

/** Follow the led suit if you hold it; otherwise any card is legal. */
export function followSuitMoves(hand: readonly Card[], led: Suit): Card[] {
  const inSuit = hand.filter((c) => c.suit === led);
  return inSuit.length > 0 ? inSuit : [...hand];
}

/**
 * Cards that may be led. A restricted suit (trump in Trump, hearts in Hearts)
 * cannot be led until it has been broken; the exception is a hand holding only
 * the restricted suit, which may lead it.
 */
export function leadMoves(hand: readonly Card[], restricted: Suit | null, broken: boolean): Card[] {
  if (restricted === null || broken) return [...hand];
  const allowed = hand.filter((c) => c.suit !== restricted);
  return allowed.length > 0 ? allowed : [...hand];
}
