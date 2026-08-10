import { describe, it, expect } from 'vitest';
import type { Card } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import { STANDARD_DECK, firstCardRecipient, dealClockwise, dealForGame } from '../card/deck';
import { makeRng } from '../rng';
import { nextDealer } from './rotation';
import { createEngine } from './engine';
import type { BatuState } from './state';
import { makeStubModule, makeStubRegistry } from './stub';

const NAMES: [string, string, string, string] = ['Ferdi', 'Adi', 'Budi', 'Cita'];
const clubs = (rank: Card['rank']): Card => ({ suit: 'clubs', rank });

// ---------------------------------------------------------------------------
// Dealing — the first-card (middle card) rule
// ---------------------------------------------------------------------------

describe('firstCardRecipient — penta.md counting table (dealer = seat 0)', () => {
  it('A / 5 / 9 / K → dealer', () => {
    for (const rank of ['A', 5, 9, 'K'] as const) {
      expect(firstCardRecipient(0, clubs(rank))).toBe(0);
    }
  });
  it('2 / 6 / 10 → left of dealer', () => {
    for (const rank of [2, 6, 10] as const) {
      expect(firstCardRecipient(0, clubs(rank))).toBe(1);
    }
  });
  it('3 / 7 / J → across', () => {
    for (const rank of [3, 7, 'J'] as const) {
      expect(firstCardRecipient(0, clubs(rank))).toBe(2);
    }
  });
  it('4 / 8 / Q → right of dealer', () => {
    for (const rank of [4, 8, 'Q'] as const) {
      expect(firstCardRecipient(0, clubs(rank))).toBe(3);
    }
  });
  it('offsets from the actual dealer and wraps', () => {
    expect(firstCardRecipient(2, clubs(2))).toBe(3);
    expect(firstCardRecipient(3, clubs(2))).toBe(0);
  });
});

describe('dealClockwise', () => {
  it('deals 13 to each seat, first card to firstRecipient', () => {
    const hands = dealClockwise(STANDARD_DECK, 1);
    for (const p of PLAYER_IDS) expect(hands[p]).toHaveLength(13);
    expect(hands[1][0]).toEqual(STANDARD_DECK[0]);
    expect(hands[2][0]).toEqual(STANDARD_DECK[1]);
    expect(hands[0][0]).toEqual(STANDARD_DECK[3]);
  });
});

describe('dealForGame', () => {
  it('deals four 13-card hands', () => {
    const { hands } = dealForGame(0, makeRng(7));
    for (const p of PLAYER_IDS) expect(hands[p]).toHaveLength(13);
  });

  it('reshuffles until the validity check passes, counting reshuffles', () => {
    let calls = 0;
    const isValid = () => ++calls > 2; // reject the first two deals
    const { hands, reshuffles } = dealForGame(0, makeRng(5), isValid);
    expect(reshuffles).toBe(2);
    for (const p of PLAYER_IDS) expect(hands[p]).toHaveLength(13);
  });
});

// ---------------------------------------------------------------------------
// Dealer rotation
// ---------------------------------------------------------------------------

describe('nextDealer', () => {
  it('a single ▼ recipient becomes dealer', () => {
    expect(nextDealer([2], makeRng(1))).toBe(2);
  });
  it('picks among several ▼ recipients', () => {
    expect([1, 3]).toContain(nextDealer([1, 3], makeRng(1)));
  });
  it('falls back to any of the four when nobody got ▼', () => {
    expect(PLAYER_IDS).toContain(nextDealer([], makeRng(1)));
  });
});

// ---------------------------------------------------------------------------
// Module serialization round-trip (stub)
// ---------------------------------------------------------------------------

describe('stub module serialization', () => {
  it('round-trips through JSON losslessly, hands included', () => {
    const mod = makeStubModule('trump');
    let state = mod.setup({ hands: dealClockwise(STANDARD_DECK, 0), dealer: 0, roundIndex: 2 });
    state = mod.applyMove(state, 0, { type: 'play' });
    const restored = mod.deserialize(JSON.parse(JSON.stringify(mod.serialize(state))));
    expect(restored).toEqual(state);
  });
});

// ---------------------------------------------------------------------------
// Full batu lifecycle
// ---------------------------------------------------------------------------

/** Drive a batu to completion by always taking the first pending legal move. */
function playOut(engine: ReturnType<typeof createEngine>, start: BatuState): BatuState {
  let s = start;
  while (!engine.isBatuOver(s)) {
    if (s.phase === 'awaiting-deal') {
      s = engine.startNextGame(s);
    } else {
      const player = engine.pendingPlayers(s)[0];
      const move = engine.legalMoves(s, player)[0];
      s = engine.applyMove(s, player, move);
    }
  }
  return s;
}

describe('full batu', () => {
  it('runs 20 games (5 × 4 rounds) end to end and tallies all five', () => {
    const engine = createEngine({ modules: makeStubRegistry(), rng: makeRng(42) });
    const final = playOut(engine, engine.create(NAMES));

    let totalRounds = 0;
    for (const gameId of ['trump', 'seven', 'hearts', 'rumpun', 'capsa'] as const) {
      expect(final.sheet[gameId]).toHaveLength(4);
      totalRounds += final.sheet[gameId].length;
    }
    expect(totalRounds).toBe(20);
    expect(Object.keys(final.pentaTallies)).toHaveLength(5);
    expect(final.phase).toBe('batu-end');
    expect(engine.champion(final).length).toBeGreaterThanOrEqual(1);
  });

  it('save/reload after every move produces identical final scores', () => {
    const uninterrupted = createEngine({ modules: makeStubRegistry(), rng: makeRng(42) });
    const finalA = playOut(uninterrupted, uninterrupted.create(NAMES));

    // Same seed, but serialize→deserialize through JSON after every step.
    const engine = createEngine({ modules: makeStubRegistry(), rng: makeRng(42) });
    const reload = (s: BatuState) =>
      engine.deserialize(JSON.parse(JSON.stringify(engine.serialize(s))));

    let s = reload(engine.create(NAMES));
    while (!engine.isBatuOver(s)) {
      if (s.phase === 'awaiting-deal') {
        s = engine.startNextGame(s);
      } else {
        const player = engine.pendingPlayers(s)[0];
        const move = engine.legalMoves(s, player)[0];
        s = engine.applyMove(s, player, move);
      }
      s = reload(s);
    }

    expect(s.sheet).toEqual(finalA.sheet);
    expect(engine.standings(s)).toEqual(uninterrupted.standings(finalA));
    expect(engine.champion(s)).toEqual(uninterrupted.champion(finalA));
  });

  it('rejects a save whose schemaVersion does not match', () => {
    const engine = createEngine({ modules: makeStubRegistry(), rng: makeRng(1) });
    const serialized = engine.serialize(engine.create(NAMES));
    expect(() => engine.deserialize({ ...serialized, schemaVersion: 999 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

describe('undo', () => {
  it('reverts the last move within a game (one step)', () => {
    const engine = createEngine({ modules: makeStubRegistry(), rng: makeRng(3) });
    const dealt = engine.startNextGame(engine.create(NAMES));
    const player = engine.pendingPlayers(dealt)[0];
    const moved = engine.applyMove(dealt, player, { type: 'play' });
    expect(engine.undo(moved)).toEqual(dealt);
  });

  it('is discarded at the round boundary', () => {
    const engine = createEngine({ modules: makeStubRegistry(), rng: makeRng(3) });
    let s = engine.startNextGame(engine.create(NAMES));
    for (let i = 0; i < 4; i++) {
      const player = engine.pendingPlayers(s)[0];
      s = engine.applyMove(s, player, { type: 'play' });
    }
    expect(s.undoSnapshot).toBeNull();
    expect(engine.undo(s)).toBe(s); // no-op
  });

  it('is a no-op when disabled in settings', () => {
    const engine = createEngine({ modules: makeStubRegistry(), rng: makeRng(3) });
    const dealt = engine.startNextGame(engine.create(NAMES, { undoEnabled: false }));
    const player = engine.pendingPlayers(dealt)[0];
    const moved = engine.applyMove(dealt, player, { type: 'play' });
    expect(engine.undo(moved)).toBe(moved);
  });
});
