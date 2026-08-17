import { describe, it, expect } from 'vitest';
import {
  STANDARD_SUIT_RANK,
  CAPSA_SUIT_RANK,
  STANDARD_CARD_RANK,
  CAPSA_CARD_RANK,
  RUMPUN_CARD_VALUE,
  SEVEN_ACE_VALUE,
} from './ordering';

describe('suit orderings', () => {
  it('standard: clubs < diamonds < hearts < spades', () => {
    expect(STANDARD_SUIT_RANK.clubs).toBeLessThan(STANDARD_SUIT_RANK.diamonds);
    expect(STANDARD_SUIT_RANK.diamonds).toBeLessThan(STANDARD_SUIT_RANK.hearts);
    expect(STANDARD_SUIT_RANK.hearts).toBeLessThan(STANDARD_SUIT_RANK.spades);
  });

  it('capsa: diamonds < clubs — inverted from standard', () => {
    expect(CAPSA_SUIT_RANK.diamonds).toBeLessThan(CAPSA_SUIT_RANK.clubs);
  });

  it('capsa: clubs < hearts < spades — same as standard from clubs upward', () => {
    expect(CAPSA_SUIT_RANK.clubs).toBeLessThan(CAPSA_SUIT_RANK.hearts);
    expect(CAPSA_SUIT_RANK.hearts).toBeLessThan(CAPSA_SUIT_RANK.spades);
  });
});

describe('card rank orderings', () => {
  it('standard: 2 is lowest, A is highest', () => {
    expect(STANDARD_CARD_RANK[2]).toBeLessThan(STANDARD_CARD_RANK[3]);
    expect(STANDARD_CARD_RANK['K']).toBeLessThan(STANDARD_CARD_RANK['A']);
  });

  it('standard: 10 < J < Q < K < A', () => {
    expect(STANDARD_CARD_RANK[10]).toBeLessThan(STANDARD_CARD_RANK['J']);
    expect(STANDARD_CARD_RANK['J']).toBeLessThan(STANDARD_CARD_RANK['Q']);
    expect(STANDARD_CARD_RANK['Q']).toBeLessThan(STANDARD_CARD_RANK['K']);
  });

  it('capsa: 3 is lowest, 2 is highest', () => {
    expect(CAPSA_CARD_RANK[3]).toBeLessThan(CAPSA_CARD_RANK[4]);
    expect(CAPSA_CARD_RANK['A']).toBeLessThan(CAPSA_CARD_RANK[2]);
  });

  it('capsa: K < A < 2', () => {
    expect(CAPSA_CARD_RANK['K']).toBeLessThan(CAPSA_CARD_RANK['A']);
    expect(CAPSA_CARD_RANK['A']).toBeLessThan(CAPSA_CARD_RANK[2]);
  });
});

describe('rumpun rank vs value distinction', () => {
  it('A outranks 10 (rank), but 10 outvalues A (scoring)', () => {
    expect(STANDARD_CARD_RANK['A']).toBeGreaterThan(STANDARD_CARD_RANK[10]);
    expect(RUMPUN_CARD_VALUE[10]).toBeGreaterThan(RUMPUN_CARD_VALUE['A']); // 5 > 4
  });

  it('full deck totals +36 across all four suits', () => {
    const perRankSum = Object.values(RUMPUN_CARD_VALUE).reduce((s, v) => s + v, 0);
    expect(perRankSum * 4).toBe(36);
  });

  it('negative values: 6 through 9 are penalty cards', () => {
    expect(RUMPUN_CARD_VALUE[6]).toBeLessThan(0);
    expect(RUMPUN_CARD_VALUE[7]).toBeLessThan(0);
    expect(RUMPUN_CARD_VALUE[8]).toBeLessThan(0);
    expect(RUMPUN_CARD_VALUE[9]).toBeLessThan(0);
  });
});

describe('seven ace convention', () => {
  it('ace-under is 1, ace-above is 14, no-ace is 7', () => {
    expect(SEVEN_ACE_VALUE.under).toBe(1);
    expect(SEVEN_ACE_VALUE.above).toBe(14);
    expect(SEVEN_ACE_VALUE.none).toBe(7);
  });
});
