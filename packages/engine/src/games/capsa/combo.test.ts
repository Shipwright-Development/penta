import { describe, it, expect } from 'vitest';
import type { Card } from '../../types/card';
import { classify, beats } from './combo';
import type { Combo } from './combo';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });
const combo = (...cards: Card[]): Combo => {
  const k = classify(cards);
  if (!k) throw new Error('expected a valid combo');
  return k;
};

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

describe('classify', () => {
  it('accepts singles and pairs, rejects standalone triples and fours', () => {
    expect(classify([c('spades', 5)])?.type).toBe('single');
    expect(classify([c('spades', 5), c('hearts', 5)])?.type).toBe('pair');
    expect(classify([c('spades', 5), c('hearts', 6)])).toBeNull();
    expect(classify([c('spades', 5), c('hearts', 5), c('clubs', 5)])).toBeNull();
    expect(classify([c('spades', 5), c('hearts', 5), c('clubs', 5), c('diamonds', 5)])).toBeNull();
  });

  it('recognises the five-card types', () => {
    expect(
      classify([c('clubs', 3), c('diamonds', 4), c('hearts', 5), c('spades', 6), c('clubs', 7)])
        ?.type,
    ).toBe('straight');
    expect(
      classify([c('hearts', 2), c('hearts', 4), c('hearts', 6), c('hearts', 8), c('hearts', 10)])
        ?.type,
    ).toBe('flush');
    expect(
      classify([c('spades', 5), c('hearts', 5), c('diamonds', 5), c('clubs', 2), c('spades', 2)])
        ?.type,
    ).toBe('fullhouse');
    expect(
      classify([c('spades', 7), c('hearts', 7), c('diamonds', 7), c('clubs', 7), c('spades', 2)])
        ?.type,
    ).toBe('four');
    expect(
      classify([c('spades', 3), c('spades', 4), c('spades', 5), c('spades', 6), c('spades', 7)])
        ?.type,
    ).toBe('straightflush');
    expect(
      classify([
        c('spades', 10),
        c('spades', 'J'),
        c('spades', 'Q'),
        c('spades', 'K'),
        c('spades', 'A'),
      ])?.type,
    ).toBe('royalflush');
  });

  it('honours the straight boundaries: A-2-3-4-5 and J-Q-K-A-2 legal, K-A-2-3-4 not', () => {
    expect(
      classify([c('clubs', 'A'), c('diamonds', 2), c('hearts', 3), c('spades', 4), c('clubs', 5)])
        ?.type,
    ).toBe('straight');
    expect(
      classify([
        c('clubs', 'J'),
        c('diamonds', 'Q'),
        c('hearts', 'K'),
        c('spades', 'A'),
        c('clubs', 2),
      ])?.type,
    ).toBe('straight');
    expect(
      classify([
        c('clubs', 'K'),
        c('diamonds', 'A'),
        c('hearts', 2),
        c('spades', 3),
        c('clubs', 4),
      ]),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Beating — singles, pairs
// ---------------------------------------------------------------------------

describe('beats — singles and pairs', () => {
  it('2 is the highest single; suit breaks a rank tie (♦<♣<♥<♠)', () => {
    expect(beats(combo(c('diamonds', 2)), combo(c('spades', 'A')))).toBe(true); // 2 over A
    expect(beats(combo(c('spades', 5)), combo(c('hearts', 5)))).toBe(true); // 5♠ over 5♥
    expect(beats(combo(c('diamonds', 5)), combo(c('clubs', 5)))).toBe(false); // 5♦ under 5♣
  });

  it('pairs compare by rank, then the higher suit', () => {
    expect(
      beats(combo(c('clubs', 2), c('diamonds', 2)), combo(c('spades', 'A'), c('hearts', 'A'))),
    ).toBe(true);
    expect(
      beats(combo(c('spades', 5), c('clubs', 5)), combo(c('hearts', 5), c('diamonds', 5))),
    ).toBe(true); // ♠ tops
  });

  it('a pair cannot beat a single (size must match for non-bombs)', () => {
    expect(beats(combo(c('spades', 2), c('hearts', 2)), combo(c('spades', 'A')))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Beating — the 5-card hierarchy and bombs
// ---------------------------------------------------------------------------

describe('beats — five-card hierarchy', () => {
  const straight = combo(
    c('clubs', 3),
    c('diamonds', 4),
    c('hearts', 5),
    c('spades', 6),
    c('clubs', 7),
  );
  const flush = combo(
    c('hearts', 2),
    c('hearts', 4),
    c('hearts', 6),
    c('hearts', 8),
    c('hearts', 10),
  );
  const fullhouse = combo(
    c('spades', 5),
    c('hearts', 5),
    c('diamonds', 5),
    c('clubs', 2),
    c('spades', 2),
  );
  const four = combo(
    c('spades', 7),
    c('hearts', 7),
    c('diamonds', 7),
    c('clubs', 7),
    c('spades', 2),
  );
  const straightFlush = combo(
    c('spades', 3),
    c('spades', 4),
    c('spades', 5),
    c('spades', 6),
    c('spades', 7),
  );
  const royal = combo(
    c('hearts', 10),
    c('hearts', 'J'),
    c('hearts', 'Q'),
    c('hearts', 'K'),
    c('hearts', 'A'),
  );

  it('flush > straight > (and full house > flush)', () => {
    expect(beats(flush, straight)).toBe(true);
    expect(beats(fullhouse, flush)).toBe(true);
    expect(beats(straight, flush)).toBe(false);
  });

  it('bombs beat any non-bomb regardless of size', () => {
    expect(beats(four, fullhouse)).toBe(true);
    expect(beats(four, combo(c('spades', 2)))).toBe(true); // over a single
    expect(beats(fullhouse, four)).toBe(false); // non-bomb can't beat a bomb
  });

  it('bomb hierarchy: four < straight flush < royal flush', () => {
    expect(beats(straightFlush, four)).toBe(true);
    expect(beats(royal, straightFlush)).toBe(true);
    expect(beats(four, straightFlush)).toBe(false);
  });

  it('royal flush tops a suited J-Q-K-A-2 straight flush (bomb hierarchy overrides straight order)', () => {
    const jqka2 = combo(
      c('spades', 'J'),
      c('spades', 'Q'),
      c('spades', 'K'),
      c('spades', 'A'),
      c('spades', 2),
    );
    expect(jqka2.type).toBe('straightflush');
    expect(beats(royal, jqka2)).toBe(true);
    expect(beats(jqka2, royal)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Straight ordering
// ---------------------------------------------------------------------------

describe('beats — straight ordering', () => {
  const s = (...ranks: Card['rank'][]) =>
    combo(
      ...ranks.map((r, i) =>
        c((['clubs', 'diamonds', 'hearts', 'spades', 'clubs'] as const)[i], r),
      ),
    );

  it('A-2-3-4-5 is the lowest straight, J-Q-K-A-2 the highest', () => {
    const low = s('A', 2, 3, 4, 5);
    const mid = s(2, 3, 4, 5, 6);
    const tenHigh = s(10, 'J', 'Q', 'K', 'A');
    const top = s('J', 'Q', 'K', 'A', 2);
    expect(beats(mid, low)).toBe(true);
    expect(beats(top, tenHigh)).toBe(true);
    expect(beats(low, top)).toBe(false);
  });
});
