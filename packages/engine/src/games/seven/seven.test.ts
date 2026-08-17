import { describe, it, expect } from 'vitest';
import type { Card, Suit } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import { dealForGame } from '../../card/deck';
import { makeRng } from '../../rng';
import type { AceConvention } from '../../card/ordering';
import { createSevenModule } from './seven';
import type { SevenState, SevenMove, SuitLine } from './seven';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });
const mod = createSevenModule();

function line(over: Partial<SuitLine>): SuitLine {
  return {
    opened: false,
    lowNonAce: null,
    highNonAce: null,
    aceLow: false,
    aceHigh: false,
    ...over,
  };
}

function mkState(over: Partial<SevenState>): SevenState {
  return {
    roundIndex: 0,
    startingSuit: 'clubs',
    hands: { 0: [], 1: [], 2: [], 3: [] },
    lines: { clubs: line({}), diamonds: line({}), hearts: line({}), spades: line({}) },
    convention: 'none',
    currentPlayer: 0,
    turnsTaken: 5,
    discards: { 0: [], 1: [], 2: [], 3: [] },
    ...over,
  };
}

const isPlay = (m: SevenMove, card: Card, end?: 'above' | 'below') =>
  m.type === 'play' && m.card.suit === card.suit && m.card.rank === card.rank && m.end === end;

// ---------------------------------------------------------------------------
// Setup & the forced first play
// ---------------------------------------------------------------------------

describe('setup', () => {
  it('starting suit rotates by round and the starting-7 holder is forced to play it', () => {
    const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
    for (let round = 0; round < 4; round++) {
      const { hands } = dealForGame(0, makeRng(40 + round));
      const s = mod.setup({ hands, dealer: 0, roundIndex: round as 0 | 1 | 2 | 3 });
      expect(s.startingSuit).toBe(suits[round]);
      const holder = PLAYER_IDS.find((p) =>
        hands[p].some((x) => x.suit === suits[round] && x.rank === 7),
      );
      expect(s.currentPlayer).toBe(holder);
      expect(mod.legalMoves(s, s.currentPlayer)).toEqual([
        { type: 'play', card: { suit: suits[round], rank: 7 } },
      ]);
    }
  });
});

// ---------------------------------------------------------------------------
// The ace convention — a genuine choice
// ---------------------------------------------------------------------------

describe('ace convention', () => {
  it('offers an ace at BOTH ends until one is placed', () => {
    const s = mkState({
      lines: {
        clubs: line({ opened: true, lowNonAce: 2, highNonAce: 'K' }),
        diamonds: line({}),
        hearts: line({}),
        spades: line({}),
      },
      hands: { 0: [c('clubs', 'A')], 1: [], 2: [], 3: [] },
    });
    const moves = mod.legalMoves(s, 0) as SevenMove[];
    expect(moves.some((m) => isPlay(m, c('clubs', 'A'), 'above'))).toBe(true);
    expect(moves.some((m) => isPlay(m, c('clubs', 'A'), 'below'))).toBe(true);
  });

  it('placing the first ace locks the convention for all suits', () => {
    const s = mkState({
      lines: {
        clubs: line({ opened: true, lowNonAce: 2, highNonAce: 'K' }),
        diamonds: line({ opened: true, lowNonAce: 2, highNonAce: 10 }),
        hearts: line({}),
        spades: line({}),
      },
      hands: { 0: [c('clubs', 'A')], 1: [c('diamonds', 'A')], 2: [], 3: [] },
    });
    const after = mod.applyMove(s, 0, { type: 'play', card: c('clubs', 'A'), end: 'above' });
    expect(after.convention).toBe('above');

    // Diamonds sits at 2 low, but aces now go above → no ace-below is offered.
    const dMoves = mod.legalMoves({ ...after, currentPlayer: 1 }, 1) as SevenMove[];
    expect(dMoves.some((m) => isPlay(m, c('diamonds', 'A'), 'below'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ace value — three cases
// ---------------------------------------------------------------------------

describe('ace value in scoring', () => {
  const scoreWithAce = (convention: AceConvention): number => {
    const s = mkState({
      turnsTaken: 52,
      convention,
      discards: { 0: [c('diamonds', 'A')], 1: [], 2: [], 3: [] },
    });
    return mod.roundResult(s).scores[0];
  };

  it('A = 1 under 2s, 14 above kings, 7 if no ace was placed at all', () => {
    expect(scoreWithAce('under')).toBe(1);
    expect(scoreWithAce('above')).toBe(14);
    expect(scoreWithAce('none')).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Line collapse & must-play
// ---------------------------------------------------------------------------

describe('line collapse and must-play', () => {
  it('a collapsed line is dead — its cards are no longer playable', () => {
    const s = mkState({
      convention: 'under',
      lines: {
        clubs: line({ opened: true, lowNonAce: 5, highNonAce: 'K' }), // K under-convention → collapsed
        diamonds: line({}),
        hearts: line({}),
        spades: line({}),
      },
      hands: { 0: [c('clubs', 4)], 1: [], 2: [], 3: [] },
    });
    // No legal play → the only move is to discard the 4♣.
    expect(mod.legalMoves(s, 0)).toEqual([{ type: 'discard', card: c('clubs', 4) }]);
  });

  it('you must play when you can — no discard is offered', () => {
    const s = mkState({
      lines: {
        clubs: line({ opened: true, lowNonAce: 7, highNonAce: 7 }),
        diamonds: line({}),
        hearts: line({}),
        spades: line({}),
      },
      hands: { 0: [c('clubs', 8), c('spades', 'K')], 1: [], 2: [], 3: [] },
    });
    const moves = mod.legalMoves(s, 0) as SevenMove[];
    expect(moves.some((m) => m.type === 'discard')).toBe(false);
    expect(moves.some((m) => isPlay(m, c('clubs', 8)))).toBe(true);
  });

  it('noPlaysLeft flags when every line is dead and nobody can play', () => {
    const dead = line({ opened: true, lowNonAce: 2, highNonAce: 'K' }); // K under-convention → collapsed
    const s = mkState({
      convention: 'under',
      turnsTaken: 20,
      lines: { clubs: dead, diamonds: dead, hearts: dead, spades: dead },
      hands: {
        0: [c('clubs', 3)],
        1: [c('diamonds', 4)],
        2: [c('hearts', 5)],
        3: [c('spades', 6)],
      },
    });
    expect((mod.publicView(s) as { noPlaysLeft: boolean }).noPlaysLeft).toBe(true);

    const fresh = mod.setup({ hands: dealForGame(0, makeRng(1)).hands, dealer: 0, roundIndex: 0 });
    expect((mod.publicView(fresh) as { noPlaysLeft: boolean }).noPlaysLeft).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full round & serialization
// ---------------------------------------------------------------------------

describe('full round', () => {
  it('runs exactly 52 turns and empties every hand', () => {
    const { hands } = dealForGame(0, makeRng(63));
    let s = mod.setup({ hands, dealer: 0, roundIndex: 0 });
    let guard = 0;
    while (!mod.isRoundOver(s) && guard++ < 200) {
      const p = mod.pendingPlayers(s)[0];
      s = mod.applyMove(s, p, mod.legalMoves(s, p)[0] as SevenMove);
    }
    expect(s.turnsTaken).toBe(52);
    expect(PLAYER_IDS.every((p) => s.hands[p].length === 0)).toBe(true);
    // Every card is either on a line or discarded; scores are well-defined.
    const r = mod.roundResult(s);
    expect(PLAYER_IDS.every((p) => typeof r.scores[p] === 'number')).toBe(true);
  });

  it('serializes and restores after the forced opening losslessly', () => {
    const { hands } = dealForGame(1, makeRng(6));
    let s = mod.setup({ hands, dealer: 1, roundIndex: 0 });
    s = mod.applyMove(s, s.currentPlayer, mod.legalMoves(s, s.currentPlayer)[0] as SevenMove);
    const restored = mod.deserialize(JSON.parse(JSON.stringify(mod.serialize(s))));
    expect(restored).toEqual(s);
  });
});
