import { describe, it, expect } from 'vitest';
import type { Card, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import { dealForGame } from '../../card/deck';
import { makeRng } from '../../rng';
import { STANDARD_CARD_RANK, STANDARD_SUIT_RANK } from '../../card/ordering';
import { createRumpunModule } from './rumpun';
import type { RumpunState, RumpunMove } from './rumpun';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });
const mod = createRumpunModule();

// ---------------------------------------------------------------------------
// Trump determination (rank, not value)
// ---------------------------------------------------------------------------

describe('trump determination', () => {
  it('trump is the suit of the highest face-up pile top; its holder leads', () => {
    const { hands } = dealForGame(0, makeRng(31));
    const s = mod.setup({ hands, dealer: 0, roundIndex: 0 });

    // The face-up tops are indices 6, 9, 12 of each dealt hand.
    let best: { card: Card; player: PlayerId } | null = null;
    for (const p of PLAYER_IDS) {
      for (const i of [6, 9, 12]) {
        const card = hands[p][i];
        if (
          !best ||
          STANDARD_CARD_RANK[card.rank] > STANDARD_CARD_RANK[best.card.rank] ||
          (STANDARD_CARD_RANK[card.rank] === STANDARD_CARD_RANK[best.card.rank] &&
            STANDARD_SUIT_RANK[card.suit] > STANDARD_SUIT_RANK[best.card.suit])
        ) {
          best = { card, player: p };
        }
      }
    }
    expect(s.trumpSuit).toBe(best!.card.suit);
    expect(s.currentTrick?.leader).toBe(best!.player);
  });
});

// ---------------------------------------------------------------------------
// Reveal-under-card after a trick
// ---------------------------------------------------------------------------

describe('reveal under a played pile top', () => {
  it('flips the card beneath a pile top once the trick resolves', () => {
    const state: RumpunState = {
      hands: { 0: [c('clubs', 3)], 1: [c('clubs', 4)], 2: [c('clubs', 5)], 3: [c('clubs', 6)] },
      piles: {
        0: [{ down: [c('diamonds', 7)], up: c('diamonds', 8) }],
        1: [],
        2: [],
        3: [],
      },
      trumpSuit: 'spades',
      currentTrick: { leader: 0, plays: [] },
      trumpBroken: false,
      trickNumber: 0,
      taken: { 0: [], 1: [], 2: [], 3: [] },
      pendingReveals: [],
    };

    let s = mod.applyMove(state, 0, { type: 'play', card: c('diamonds', 8) }); // pile top
    s = mod.applyMove(s, 1, { type: 'play', card: c('clubs', 4) });
    s = mod.applyMove(s, 2, { type: 'play', card: c('clubs', 5) });
    s = mod.applyMove(s, 3, { type: 'play', card: c('clubs', 6) });

    // 8♦ was the only diamond (led suit); the clubs are off-suit dumps → seat 0 wins.
    expect(s.taken[0]).toHaveLength(4);
    // The pile now shows the revealed 7♦ with nothing beneath.
    expect(s.piles[0][0]).toEqual({ down: [], up: c('diamonds', 7) });
  });
});

// ---------------------------------------------------------------------------
// Scoring uses value, not rank
// ---------------------------------------------------------------------------

describe('scoring — value vs rank', () => {
  const endState = (taken: Record<PlayerId, Card[]>): RumpunState => ({
    hands: { 0: [], 1: [], 2: [], 3: [] },
    piles: { 0: [], 1: [], 2: [], 3: [] },
    trumpSuit: 'spades',
    currentTrick: null,
    trumpBroken: true,
    trickNumber: 13,
    taken,
    pendingReveals: [],
  });

  it('a 10 (value +5) outscores an Ace (value +4), though the Ace outranks it', () => {
    expect(STANDARD_CARD_RANK['A']).toBeGreaterThan(STANDARD_CARD_RANK[10]);
    const r = mod.roundResult(
      endState({ 0: [c('spades', 10)], 1: [c('spades', 'A')], 2: [], 3: [] }),
    );
    expect(r.scores[0]).toBe(5);
    expect(r.scores[1]).toBe(4);
    expect(r.winners).toEqual([0]); // higher value places first (ranks high)
  });
});

// ---------------------------------------------------------------------------
// Full round & the +36 invariant
// ---------------------------------------------------------------------------

describe('full round', () => {
  it('plays 13 tricks and the round scores total the deck value of +36', () => {
    const { hands } = dealForGame(0, makeRng(77));
    let s = mod.setup({ hands, dealer: 0, roundIndex: 0 });
    let guard = 0;
    while (!mod.isRoundOver(s) && guard++ < 300) {
      const p = mod.pendingPlayers(s)[0];
      s = mod.applyMove(s, p, mod.legalMoves(s, p)[0] as RumpunMove);
    }
    expect(mod.isRoundOver(s)).toBe(true);
    expect(s.trickNumber).toBe(13);
    const total = PLAYER_IDS.reduce<number>((sum, p) => sum + mod.roundResult(s).scores[p], 0);
    expect(total).toBe(36);
  });

  it('serializes and restores mid-round losslessly', () => {
    const { hands } = dealForGame(2, makeRng(8));
    let s = mod.setup({ hands, dealer: 2, roundIndex: 0 });
    const opener = mod.pendingPlayers(s)[0];
    s = mod.applyMove(s, opener, mod.legalMoves(s, opener)[0] as RumpunMove);
    const restored = mod.deserialize(JSON.parse(JSON.stringify(mod.serialize(s))));
    expect(restored).toEqual(s);
  });
});
