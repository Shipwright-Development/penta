import type { Card, Suit, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import { STANDARD_SUIT_RANK, STANDARD_CARD_RANK } from '../../card/ordering';

/**
 * A bid as placed. Both cards of a two-card bid must be the same kind — two
 * number cards (A–10) or two face cards (J/Q/K), never mixed. Two face cards
 * carry a "shouted" target; digitally that's just a number ≥ 7.
 */
export type Bid =
  | { kind: 'single'; card: Card }
  | { kind: 'numbers'; cards: [Card, Card] }
  | { kind: 'faces'; cards: [Card, Card]; shout: number };

export type BidSuit = Suit | 'NT';

export const MIN_TWO_CARD_BID = 7;
/** A shout can't exceed the 13 tricks in play; used to bound legalMoves. */
export const MAX_SHOUT = 13;

export function isNumberCard(card: Card): boolean {
  return card.rank === 'A' || typeof card.rank === 'number';
}

export function isFaceCard(card: Card): boolean {
  return card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
}

/** A card's bid value: 2–10 face value, A = 1, J/Q/K = 0. */
export function cardBidValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (isFaceCard(card)) return 0;
  return card.rank as number;
}

export function bidValue(bid: Bid): number {
  switch (bid.kind) {
    case 'single':
      return cardBidValue(bid.card);
    case 'numbers':
      return cardBidValue(bid.cards[0]) + cardBidValue(bid.cards[1]);
    case 'faces':
      return bid.shout;
  }
}

/** A single card's suit is trump; two cards of different suits declare NT. */
export function bidSuit(bid: Bid): BidSuit {
  if (bid.kind === 'single') return bid.card.suit;
  const [a, b] = bid.cards;
  return a.suit === b.suit ? a.suit : 'NT';
}

/** The trump suit a bid would set, or null for NT. */
export function trumpFromBid(bid: Bid): Suit | null {
  const suit = bidSuit(bid);
  return suit === 'NT' ? null : suit;
}

/** For the suit tiebreak: a single's suit, or a two-card bid's higher suit. */
function bidSuitRank(bid: Bid): number {
  if (bid.kind === 'single') return STANDARD_SUIT_RANK[bid.card.suit];
  return Math.max(STANDARD_SUIT_RANK[bid.cards[0].suit], STANDARD_SUIT_RANK[bid.cards[1].suit]);
}

function cardOutranks(a: Card, b: Card): boolean {
  if (STANDARD_CARD_RANK[a.rank] !== STANDARD_CARD_RANK[b.rank]) {
    return STANDARD_CARD_RANK[a.rank] > STANDARD_CARD_RANK[b.rank];
  }
  return STANDARD_SUIT_RANK[a.suit] > STANDARD_SUIT_RANK[b.suit];
}

/** The single highest card in a bid, for the third tiebreak tier. */
function bidHighestCard(bid: Bid): Card {
  const cards = bid.kind === 'single' ? [bid.card] : bid.cards;
  return cards.reduce((hi, c) => (cardOutranks(c, hi) ? c : hi));
}

/**
 * Whether bid `a` outranks bid `b` for the highest-bidder contest. Three tiers:
 * bid value, then suit ranking, then the highest individual card. All cards are
 * unique, so the third tier always resolves — no same-suit deadlock.
 */
function bidOutranks(a: Bid, b: Bid): boolean {
  if (bidValue(a) !== bidValue(b)) return bidValue(a) > bidValue(b);
  if (bidSuitRank(a) !== bidSuitRank(b)) return bidSuitRank(a) > bidSuitRank(b);
  return cardOutranks(bidHighestCard(a), bidHighestCard(b));
}

export function highestBidder(bids: Record<PlayerId, Bid>): PlayerId {
  let winner: PlayerId = PLAYER_IDS[0];
  for (const p of PLAYER_IDS) {
    if (bidOutranks(bids[p], bids[winner])) winner = p;
  }
  return winner;
}

/**
 * Every legal bid from a hand: each single card, each same-kind pair of number
 * cards summing to ≥ 7, and each pair of face cards with a shout in 7..MAX_SHOUT.
 * Mixed number+face pairs are never legal.
 */
export function legalBids(hand: readonly Card[]): Bid[] {
  const bids: Bid[] = [];
  for (const card of hand) bids.push({ kind: 'single', card });

  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const a = hand[i];
      const b = hand[j];
      if (isNumberCard(a) && isNumberCard(b)) {
        if (cardBidValue(a) + cardBidValue(b) >= MIN_TWO_CARD_BID) {
          bids.push({ kind: 'numbers', cards: [a, b] });
        }
      } else if (isFaceCard(a) && isFaceCard(b)) {
        for (let shout = MIN_TWO_CARD_BID; shout <= MAX_SHOUT; shout++) {
          bids.push({ kind: 'faces', cards: [a, b], shout });
        }
      }
    }
  }
  return bids;
}

function handHas(hand: readonly Card[], card: Card): boolean {
  return hand.some((c) => c.suit === card.suit && c.rank === card.rank);
}

/**
 * Validate a bid against a hand and the bid rules. Enforces the true rules
 * (same-kind pairs, sums, shout ≥ 7) rather than membership in the bounded
 * legalBids enumeration, so a shout above MAX_SHOUT is still accepted.
 */
export function isValidBid(bid: Bid, hand: readonly Card[]): boolean {
  switch (bid.kind) {
    case 'single':
      return handHas(hand, bid.card);
    case 'numbers': {
      const [a, b] = bid.cards;
      return (
        handHas(hand, a) &&
        handHas(hand, b) &&
        !(a.suit === b.suit && a.rank === b.rank) &&
        isNumberCard(a) &&
        isNumberCard(b) &&
        cardBidValue(a) + cardBidValue(b) >= MIN_TWO_CARD_BID
      );
    }
    case 'faces': {
      const [a, b] = bid.cards;
      return (
        handHas(hand, a) &&
        handHas(hand, b) &&
        !(a.suit === b.suit && a.rank === b.rank) &&
        isFaceCard(a) &&
        isFaceCard(b) &&
        bid.shout >= MIN_TWO_CARD_BID
      );
    }
  }
}
