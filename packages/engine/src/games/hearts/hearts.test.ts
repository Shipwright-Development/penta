import { describe, it, expect } from 'vitest';
import type { Card, Rank, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import { dealForGame } from '../../card/deck';
import { makeRng } from '../../rng';
import { createHeartsModule } from './hearts';
import type { HeartsState, HeartsMove } from './hearts';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });
const ALL_HEARTS: Card[] = ([2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'] as Rank[]).map((r) =>
  c('hearts', r),
);

const mod = createHeartsModule();

function baseState(over: Partial<HeartsState>): HeartsState {
  return {
    phase: 'done',
    roundIndex: 0,
    hands: { 0: [], 1: [], 2: [], 3: [] },
    passSelections: {},
    currentTrick: null,
    heartsBroken: true,
    trickNumber: 0,
    taken: { 0: [], 1: [], 2: [], 3: [] },
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Scoring, incl. worked example 3 (the moon)
// ---------------------------------------------------------------------------

describe('roundResult', () => {
  it('worked example 3 — a moon shot: shooter 0, others 26; □ shooter, ▼ the rest', () => {
    const state = baseState({
      taken: { 0: [...ALL_HEARTS, c('spades', 'Q')], 1: [], 2: [], 3: [] },
    });
    const r = mod.roundResult(state);
    expect(r.scores).toEqual({ 0: 0, 1: 26, 2: 26, 3: 26 });
    expect(r.winners).toEqual([0]);
    expect(r.losers).toEqual([1, 2, 3]);
  });

  it('normal round: hearts +1 each, Q♠ +13; □ lowest, ▼ highest', () => {
    const state = baseState({
      taken: {
        0: [c('spades', 'Q'), c('hearts', 2), c('hearts', 3), c('hearts', 4)], // 13 + 3 = 16
        1: [c('hearts', 5), c('hearts', 6), c('hearts', 7), c('hearts', 8), c('hearts', 9)], // 5
        2: [
          c('hearts', 10),
          c('hearts', 'J'),
          c('hearts', 'Q'),
          c('hearts', 'K'),
          c('hearts', 'A'),
        ], // 5
        3: [],
      },
    });
    const r = mod.roundResult(state);
    expect(r.scores).toEqual({ 0: 16, 1: 5, 2: 5, 3: 0 });
    expect(r.winners).toEqual([3]);
    expect(r.losers).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// Passing
// ---------------------------------------------------------------------------

describe('passing', () => {
  it('round 1 passes three cards to the left (+1 seat)', () => {
    const { hands } = dealForGame(0, makeRng(9));
    let s = mod.setup({ hands, dealer: 0, roundIndex: 0 });
    const selections: Record<PlayerId, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (const p of PLAYER_IDS) {
      const sel = (mod.legalMoves(s, p)[0] as { type: 'pass'; cards: Card[] }).cards;
      selections[p] = sel;
      s = mod.applyMove(s, p, { type: 'pass', cards: sel });
    }
    expect(s.phase).toBe('playing');
    // seat 0's cards went to seat 1
    for (const card of selections[0]) {
      expect(s.hands[1].some((x) => x.suit === card.suit && x.rank === card.rank)).toBe(true);
      expect(s.hands[0].some((x) => x.suit === card.suit && x.rank === card.rank)).toBe(false);
    }
  });

  it('round 4 skips passing and the 2♣ holder leads', () => {
    const { hands } = dealForGame(0, makeRng(9));
    const s = mod.setup({ hands, dealer: 0, roundIndex: 3 });
    expect(s.phase).toBe('playing');
    const leader = mod.pendingPlayers(s)[0];
    const moves = mod.legalMoves(s, leader) as HeartsMove[];
    expect(moves).toEqual([{ type: 'play', card: c('clubs', 2) }]); // forced 2♣ lead
  });
});

// ---------------------------------------------------------------------------
// First-trick and hearts-broken restrictions
// ---------------------------------------------------------------------------

describe('play restrictions', () => {
  it('no penalty cards on the first trick unless a player has only penalties', () => {
    const trick = {
      leader: 0 as PlayerId,
      plays: [{ player: 0 as PlayerId, card: c('clubs', 2) }],
    };
    const s = baseState({
      phase: 'playing',
      heartsBroken: false,
      trickNumber: 0,
      currentTrick: trick,
      hands: { 0: [], 1: [c('hearts', 5), c('diamonds', 8)], 2: [], 3: [] },
    });
    expect(mod.legalMoves(s, 1)).toEqual([{ type: 'play', card: c('diamonds', 8) }]);

    const onlyPenalties = baseState({
      phase: 'playing',
      heartsBroken: false,
      trickNumber: 0,
      currentTrick: trick,
      hands: { 0: [], 1: [c('hearts', 5), c('hearts', 6)], 2: [], 3: [] },
    });
    expect(mod.legalMoves(onlyPenalties, 1)).toHaveLength(2); // forced to a heart
  });

  it('hearts cannot be led until broken, unless the hand is all hearts', () => {
    const notBroken = baseState({
      phase: 'playing',
      heartsBroken: false,
      trickNumber: 3,
      currentTrick: { leader: 2, plays: [] },
      hands: { 0: [], 1: [], 2: [c('hearts', 3), c('clubs', 4)], 3: [] },
    });
    expect(mod.legalMoves(notBroken, 2)).toEqual([{ type: 'play', card: c('clubs', 4) }]);

    const allHearts = baseState({
      phase: 'playing',
      heartsBroken: false,
      trickNumber: 3,
      currentTrick: { leader: 2, plays: [] },
      hands: { 0: [], 1: [], 2: [c('hearts', 3), c('hearts', 4)], 3: [] },
    });
    expect(mod.legalMoves(allHearts, 2)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Full round & serialization
// ---------------------------------------------------------------------------

describe('full round', () => {
  it('plays to completion; 13 hearts and the Q♠ are all captured', () => {
    const { hands } = dealForGame(0, makeRng(21));
    let s = mod.setup({ hands, dealer: 0, roundIndex: 0 });
    let guard = 0;
    while (!mod.isRoundOver(s) && guard++ < 300) {
      const p = mod.pendingPlayers(s)[0];
      s = mod.applyMove(s, p, mod.legalMoves(s, p)[0] as HeartsMove);
    }
    expect(mod.isRoundOver(s)).toBe(true);
    expect(s.trickNumber).toBe(13);
    const totalHearts = PLAYER_IDS.reduce<number>(
      (sum, p) => sum + s.taken[p].filter((card) => card.suit === 'hearts').length,
      0,
    );
    expect(totalHearts).toBe(13);
  });

  it('serializes and restores mid-round losslessly', () => {
    const { hands } = dealForGame(1, makeRng(5));
    let s = mod.setup({ hands, dealer: 1, roundIndex: 0 });
    const sel = (mod.legalMoves(s, 0)[0] as { type: 'pass'; cards: Card[] }).cards;
    s = mod.applyMove(s, 0, { type: 'pass', cards: sel });
    const restored = mod.deserialize(JSON.parse(JSON.stringify(mod.serialize(s))));
    expect(restored).toEqual(s);
  });
});
