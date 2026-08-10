import { describe, it, expect } from 'vitest';
import type { Card, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import { dealForGame } from '../../card/deck';
import { makeRng } from '../../rng';
import { createCapsaModule } from './capsa';
import type { CapsaState, CapsaMove } from './capsa';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });

// ---------------------------------------------------------------------------
// Setup & opening
// ---------------------------------------------------------------------------

describe('setup & opening', () => {
  const mod = createCapsaModule();
  const hands = {
    0: [c('diamonds', 3), c('diamonds', 4)],
    1: [c('diamonds', 5), c('diamonds', 8)],
    2: [c('diamonds', 6), c('diamonds', 9)],
    3: [c('diamonds', 7), c('diamonds', 10)],
  } as Record<PlayerId, Card[]>;

  it('the 3♦ holder opens', () => {
    const s = mod.setup({ hands, dealer: 2, roundIndex: 0 });
    expect(s.currentPlayer).toBe(0);
    expect(mod.pendingPlayers(s)).toEqual([0]);
  });

  it('every opening move includes the 3♦', () => {
    const s = mod.setup({ hands, dealer: 2, roundIndex: 0 });
    const moves = mod.legalMoves(s, 0) as CapsaMove[];
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.type).toBe('play');
      if (m.type === 'play') {
        expect(m.cards.some((x) => x.suit === 'diamonds' && x.rank === 3)).toBe(true);
      }
    }
  });

  it('rejects an opening play without the 3♦', () => {
    const s = mod.setup({ hands, dealer: 2, roundIndex: 0 });
    expect(() => mod.applyMove(s, 0, { type: 'play', cards: [c('diamonds', 4)] })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Passing locks a player out until a fresh lead
// ---------------------------------------------------------------------------

describe('pass lock-out', () => {
  const mod = createCapsaModule();
  const hands = {
    0: [c('diamonds', 3), c('diamonds', 4)],
    1: [c('diamonds', 5), c('spades', 8)],
    2: [c('diamonds', 6), c('spades', 9)],
    3: [c('diamonds', 7), c('spades', 10)],
  } as Record<PlayerId, Card[]>;

  it('a passed player is skipped, and the last player leads fresh once all others pass', () => {
    const mod2 = mod;
    let s = mod2.setup({ hands, dealer: 0, roundIndex: 0 });

    s = mod2.applyMove(s, 0, { type: 'play', cards: [c('diamonds', 3)] }); // lead single 3♦
    expect(s.currentPlayer).toBe(1);

    s = mod2.applyMove(s, 1, { type: 'pass' }); // seat 1 out for the sequence
    expect(s.passed).toContain(1);
    expect(s.currentPlayer).toBe(2);

    s = mod2.applyMove(s, 2, { type: 'play', cards: [c('diamonds', 6)] }); // beats 3♦
    expect(s.lastPlayer).toBe(2);
    expect(s.currentPlayer).toBe(3); // seat 1 skipped, would be next but is passed → 3

    s = mod2.applyMove(s, 3, { type: 'pass' });
    expect(s.currentPlayer).toBe(0); // seat 1 skipped again

    s = mod2.applyMove(s, 0, { type: 'pass' }); // everyone but seat 2 has now passed
    expect(s.currentCombo).toBeNull(); // fresh lead
    expect(s.currentPlayer).toBe(2); // last player leads
    expect(s.passed).toEqual([]); // everyone back in
  });

  it('cannot pass when leading fresh', () => {
    let s = mod.setup({ hands, dealer: 0, roundIndex: 0 });
    s = mod.applyMove(s, 0, { type: 'play', cards: [c('diamonds', 3)] });
    // give control back to seat 0 as a fresh lead
    s = mod.applyMove(s, 1, { type: 'pass' });
    s = mod.applyMove(s, 2, { type: 'pass' });
    s = mod.applyMove(s, 3, { type: 'pass' });
    expect(s.currentCombo).toBeNull();
    expect(s.currentPlayer).toBe(0);
    expect(() => mod.applyMove(s, 0, { type: 'pass' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe('roundResult', () => {
  const mod = createCapsaModule();
  const endState = (counts: [number, number, number, number], winner: PlayerId): CapsaState => ({
    hands: {
      0: Array.from({ length: counts[0] }, () => c('spades', 4)),
      1: Array.from({ length: counts[1] }, () => c('spades', 4)),
      2: Array.from({ length: counts[2] }, () => c('spades', 4)),
      3: Array.from({ length: counts[3] }, () => c('spades', 4)),
    } as Record<PlayerId, Card[]>,
    currentPlayer: 0,
    currentCombo: null,
    lastPlayer: winner,
    passed: [],
    opened: true,
    winner,
  });

  it('scores cards left; □ to the player who went out, ▼ to the most cards', () => {
    const r = mod.roundResult(endState([0, 2, 1, 3], 0));
    expect(r.scores).toEqual({ 0: 0, 1: 2, 2: 1, 3: 3 });
    expect(r.winners).toEqual([0]);
    expect(r.losers).toEqual([3]);
  });

  it('ties for most cards give ▼ to each', () => {
    const r = mod.roundResult(endState([0, 2, 2, 1], 0));
    expect(r.winners).toEqual([0]);
    expect(r.losers).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// Full round & serialization
// ---------------------------------------------------------------------------

describe('createCapsaModule — full round', () => {
  it('plays to completion; the winner empties their hand', () => {
    const mod = createCapsaModule();
    const { hands } = dealForGame(0, makeRng(11));
    let s = mod.setup({ hands, dealer: 0, roundIndex: 0 });

    let guard = 0;
    while (!mod.isRoundOver(s) && guard++ < 3000) {
      const player = mod.pendingPlayers(s)[0];
      const move = mod.legalMoves(s, player)[0] as CapsaMove;
      s = mod.applyMove(s, player, move);
    }

    expect(mod.isRoundOver(s)).toBe(true);
    const result = mod.roundResult(s);
    expect(s.winner).not.toBeNull();
    expect(result.scores[s.winner as PlayerId]).toBe(0);
    expect(result.winners).toEqual([s.winner]);
    // The three who didn't go out still hold cards.
    const others = PLAYER_IDS.filter((p) => p !== s.winner);
    expect(others.every((p) => s.hands[p].length > 0)).toBe(true);
  });

  it('serializes and restores mid-round losslessly', () => {
    const mod = createCapsaModule();
    const { hands } = dealForGame(1, makeRng(4));
    let s = mod.setup({ hands, dealer: 1, roundIndex: 0 });
    const opener = mod.pendingPlayers(s)[0];
    s = mod.applyMove(s, opener, mod.legalMoves(s, opener)[0] as CapsaMove);

    const restored = mod.deserialize(JSON.parse(JSON.stringify(mod.serialize(s))));
    expect(restored).toEqual(s);
  });
});
