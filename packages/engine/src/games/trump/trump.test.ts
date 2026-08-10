import { describe, it, expect } from 'vitest';
import type { Card, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import type { PlayerScores } from '../../scoring/types';
import { dealClockwise, STANDARD_DECK } from '../../card/deck';
import { cardBidValue, bidValue, bidSuit, highestBidder, legalBids, isValidBid } from './bid';
import type { Bid } from './bid';
import { trumpScores } from './scoring';
import { createTrumpModule, trumpDealValid } from './trump';
import type { TrumpMove } from './trump';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });
const ps = (f: number, a: number, b: number, d: number): PlayerScores =>
  ({ 0: f, 1: a, 2: b, 3: d }) as PlayerScores;
const flags = (f: boolean, a: boolean, b: boolean, d: boolean): Record<PlayerId, boolean> =>
  ({ 0: f, 1: a, 2: b, 3: d }) as Record<PlayerId, boolean>;

// ---------------------------------------------------------------------------
// Bid values and suits
// ---------------------------------------------------------------------------

describe('bid values', () => {
  it('cards: 2–10 face value, A = 1, J/Q/K = 0', () => {
    expect(cardBidValue(c('spades', 5))).toBe(5);
    expect(cardBidValue(c('spades', 'A'))).toBe(1);
    expect(cardBidValue(c('spades', 'J'))).toBe(0);
    expect(cardBidValue(c('spades', 'K'))).toBe(0);
  });

  it('single = card value; number pair = sum; face pair = shout', () => {
    expect(bidValue({ kind: 'single', card: c('spades', 5) })).toBe(5);
    expect(bidValue({ kind: 'numbers', cards: [c('spades', 3), c('spades', 5)] })).toBe(8);
    expect(bidValue({ kind: 'faces', cards: [c('spades', 'J'), c('hearts', 'Q')], shout: 9 })).toBe(
      9,
    );
  });

  it('two cards of different suits declare NT', () => {
    expect(bidSuit({ kind: 'numbers', cards: [c('spades', 3), c('hearts', 5)] })).toBe('NT');
    expect(bidSuit({ kind: 'numbers', cards: [c('spades', 3), c('spades', 5)] })).toBe('spades');
    expect(bidSuit({ kind: 'single', card: c('diamonds', 7) })).toBe('diamonds');
  });
});

// ---------------------------------------------------------------------------
// Highest-bidder resolution — the three tiers
// ---------------------------------------------------------------------------

describe('highestBidder', () => {
  it('tier 1: highest bid value wins (worked example 1)', () => {
    const bids: Record<PlayerId, Bid> = {
      0: { kind: 'single', card: c('spades', 5) },
      1: { kind: 'single', card: c('hearts', 3) },
      2: { kind: 'single', card: c('diamonds', 4) },
      3: { kind: 'single', card: c('clubs', 'A') },
    };
    expect(highestBidder(bids)).toBe(0);
  });

  it('tier 2: equal value broken by suit ranking (♣<♦<♥<♠)', () => {
    const bids: Record<PlayerId, Bid> = {
      0: { kind: 'single', card: c('hearts', 8) },
      1: { kind: 'single', card: c('spades', 8) },
      2: { kind: 'single', card: c('clubs', 2) },
      3: { kind: 'single', card: c('diamonds', 2) },
    };
    expect(highestBidder(bids)).toBe(1); // 8♠ over 8♥
  });

  it('tier 3: equal value and suit broken by the highest individual card', () => {
    // single 8♠ vs 3♠+5♠ — same value (8) and same suit (♠); 8♠ beats 5♠.
    const bids: Record<PlayerId, Bid> = {
      0: { kind: 'single', card: c('spades', 8) },
      1: { kind: 'numbers', cards: [c('spades', 3), c('spades', 5)] },
      2: { kind: 'single', card: c('clubs', 2) },
      3: { kind: 'single', card: c('diamonds', 2) },
    };
    expect(highestBidder(bids)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bid enumeration and validation
// ---------------------------------------------------------------------------

describe('legalBids', () => {
  it('offers singles, number pairs ≥7, face pairs — never a mixed pair', () => {
    const hand = [
      c('spades', 3),
      c('spades', 5),
      c('spades', 2),
      c('hearts', 'J'),
      c('hearts', 'Q'),
    ];
    const bids = legalBids(hand);

    expect(bids.filter((b) => b.kind === 'single')).toHaveLength(5);

    const numberPairs = bids.filter((b) => b.kind === 'numbers');
    // valid: 3+5=8, 5+2=7. Invalid: 3+2=5 (<7). So two number pairs.
    expect(numberPairs).toHaveLength(2);

    // face pair J+Q, shouts 7..13 → 7 bids.
    expect(bids.filter((b) => b.kind === 'faces')).toHaveLength(7);

    // No pair ever mixes a number card with a face card.
    for (const b of bids) {
      if (b.kind === 'numbers' || b.kind === 'faces') {
        const bothFace = b.cards.every((x) => x.rank === 'J' || x.rank === 'Q' || x.rank === 'K');
        const bothNumber = b.cards.every((x) => x.rank === 'A' || typeof x.rank === 'number');
        expect(bothFace || bothNumber).toBe(true);
      }
    }
  });

  it('isValidBid rejects mixed pairs and sub-7 number pairs', () => {
    const hand = [c('spades', 3), c('spades', 2), c('hearts', 'J')];
    expect(isValidBid({ kind: 'numbers', cards: [c('spades', 3), c('spades', 2)] }, hand)).toBe(
      false,
    ); // sum 5 < 7
    expect(isValidBid({ kind: 'single', card: c('hearts', 'J') }, hand)).toBe(true);
    expect(isValidBid({ kind: 'single', card: c('clubs', 4) }, hand)).toBe(false); // not in hand
  });
});

// ---------------------------------------------------------------------------
// Scoring — the worked examples (worked-examples.md §1, §2, §2b)
// ---------------------------------------------------------------------------

describe('trumpScores — worked example 1 (exactly-13, adjusted up)', () => {
  it('adjusted bids 6/4/5/2, won 6/3/3/1 → 6/−2/−4/−2', () => {
    const scores = trumpScores({
      finalBids: ps(6, 4, 5, 2),
      tricksWon: ps(6, 3, 3, 1),
      wasZeroBid: flags(false, false, false, false),
    });
    expect(scores).toEqual(ps(6, -2, -4, -2));
  });
});

describe('trumpScores — worked example 2 (adjusted down past zero)', () => {
  it('adjusted bids 5/−2/1/1, won 5/2/3/3 → 5/−9/−4/−4', () => {
    const scores = trumpScores({
      finalBids: ps(5, -2, 1, 1),
      tricksWon: ps(5, 2, 3, 3),
      wasZeroBid: flags(false, true, false, false), // Adi originally bid K = 0
    });
    expect(scores).toEqual(ps(5, -9, -4, -4));
  });
});

describe('trumpScores — worked example 2b (three zero-adjacent cases)', () => {
  // Adjusted bids 5/−2/0/2 (total 5, under 13). Budi (seat 2) is adjusted *to* 0.
  it('a bid adjusted to 0, taking 0 tricks, scores 0 (not +5)', () => {
    const scores = trumpScores({
      finalBids: ps(5, -2, 0, 2),
      tricksWon: ps(5, 2, 0, 6),
      wasZeroBid: flags(false, true, false, false), // Budi was NOT a genuine 0-bid
    });
    expect(scores[2]).toBe(0);
  });

  it('a bid adjusted to 0, taking 2 tricks, pays −2 per trick over (under-13)', () => {
    const scores = trumpScores({
      finalBids: ps(5, -2, 0, 2),
      tricksWon: ps(5, 2, 2, 4),
      wasZeroBid: flags(false, true, false, false),
    });
    expect(scores[2]).toBe(-4);
  });

  it('a genuine 0-bid: +5 for taking none, −5/−7 for taking one/two', () => {
    const base = { finalBids: ps(0, 4, 5, 3), wasZeroBid: flags(true, false, false, false) };
    expect(trumpScores({ ...base, tricksWon: ps(0, 4, 5, 4) })[0]).toBe(5);
    expect(trumpScores({ ...base, tricksWon: ps(1, 4, 5, 3) })[0]).toBe(-5);
    expect(trumpScores({ ...base, tricksWon: ps(2, 4, 4, 3) })[0]).toBe(-7);
  });

  it('a genuine 0-bid pushed below 0 uses the below-0 rule, not the 0-bid rule', () => {
    const scores = trumpScores({
      finalBids: ps(-2, 5, 5, 5),
      tricksWon: ps(2, 4, 4, 3),
      wasZeroBid: flags(true, false, false, false),
    });
    expect(scores[0]).toBe(-9); // −5 − 2×2
  });
});

// ---------------------------------------------------------------------------
// Deal validity
// ---------------------------------------------------------------------------

describe('trumpDealValid', () => {
  it('accepts a deal where every hand has all four suits', () => {
    // dealClockwise of the ordered deck gives each seat one full suit — valid.
    expect(trumpDealValid(dealClockwise(STANDARD_DECK, 0))).toBe(true);
  });

  it('rejects a deal where a hand is missing a suit', () => {
    const hands = {
      0: [c('spades', 2)],
      1: [c('hearts', 2)],
      2: [c('clubs', 2)],
      3: [c('diamonds', 2)],
    } as Record<PlayerId, Card[]>;
    expect(trumpDealValid(hands)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full round played out headless
// ---------------------------------------------------------------------------

describe('createTrumpModule — headless round', () => {
  it('bids, resolves, plays 13 tricks, and reports a valid result', () => {
    const mod = createTrumpModule();
    let state = mod.setup({ hands: dealClockwise(STANDARD_DECK, 0), dealer: 0, roundIndex: 0 });

    // Drive the whole round by always taking the first legal move.
    let guard = 0;
    while (!mod.isRoundOver(state) && guard++ < 200) {
      const player = mod.pendingPlayers(state)[0];
      const move = mod.legalMoves(state, player)[0] as TrumpMove;
      state = mod.applyMove(state, player, move);
    }

    expect(mod.isRoundOver(state)).toBe(true);
    expect(state.tricksPlayed).toBe(13);
    expect(PLAYER_IDS.reduce<number>((s, p) => s + state.tricksWon[p], 0)).toBe(13);

    const result = mod.roundResult(state);
    expect(PLAYER_IDS.every((p) => typeof result.scores[p] === 'number')).toBe(true);
    // Every hand emptied.
    for (const p of PLAYER_IDS) expect(state.hands[p]).toHaveLength(0);
  });

  it('serializes and restores mid-round losslessly', () => {
    const mod = createTrumpModule();
    let state = mod.setup({ hands: dealClockwise(STANDARD_DECK, 1), dealer: 1, roundIndex: 2 });
    // Place one bid, then snapshot mid-bidding (hidden info still present).
    const firstBid = mod.legalMoves(state, 1)[0] as TrumpMove;
    state = mod.applyMove(state, 1, firstBid);

    const restored = mod.deserialize(JSON.parse(JSON.stringify(mod.serialize(state))));
    expect(restored).toEqual(state);
  });
});
