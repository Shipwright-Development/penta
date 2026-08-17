import { describe, it, expect } from 'vitest';
import type { Card } from '../types/card';
import { newTrick, trickWinner, followSuitMoves, leadMoves } from './trick';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });

function trick(leader: 0 | 1 | 2 | 3, ...cards: Card[]) {
  const t = newTrick(leader);
  cards.forEach((card, i) => t.plays.push({ player: ((leader + i) % 4) as 0 | 1 | 2 | 3, card }));
  return t;
}

describe('trickWinner', () => {
  it('highest card of the led suit wins when no trump is played', () => {
    const t = trick(0, c('hearts', 4), c('hearts', 'K'), c('hearts', 9), c('clubs', 'A'));
    expect(trickWinner(t, 'spades')).toBe(1); // K♥, and the A♣ is an off-suit dump
  });

  it('any trump beats the led suit', () => {
    const t = trick(0, c('hearts', 'A'), c('spades', 2), c('hearts', 'K'), c('hearts', 3));
    expect(trickWinner(t, 'spades')).toBe(1); // 2♠ trumps the A♥
  });

  it('highest trump wins when several are played', () => {
    const t = trick(0, c('hearts', 'A'), c('spades', 2), c('spades', 10), c('spades', 5));
    expect(trickWinner(t, 'spades')).toBe(2); // 10♠
  });

  it('off-suit non-trump cards are dumps that cannot win', () => {
    const t = trick(0, c('hearts', 5), c('clubs', 'A'), c('diamonds', 'A'), c('hearts', 6));
    expect(trickWinner(t, 'spades')).toBe(3); // 6♥ beats 5♥; the aces are dumps
  });

  it('no-trump (null): highest led suit wins', () => {
    const t = trick(0, c('clubs', 7), c('clubs', 'Q'), c('spades', 'A'), c('clubs', 9));
    expect(trickWinner(t, null)).toBe(1); // Q♣
  });
});

describe('followSuitMoves', () => {
  it('restricts to the led suit when held', () => {
    const hand = [c('hearts', 2), c('hearts', 9), c('spades', 'A')];
    expect(followSuitMoves(hand, 'hearts')).toEqual([c('hearts', 2), c('hearts', 9)]);
  });

  it('allows any card when the led suit is not held', () => {
    const hand = [c('spades', 'A'), c('clubs', 3)];
    expect(followSuitMoves(hand, 'hearts')).toEqual(hand);
  });
});

describe('leadMoves', () => {
  it('excludes the restricted suit until it is broken', () => {
    const hand = [c('spades', 2), c('hearts', 5), c('clubs', 9)];
    expect(leadMoves(hand, 'spades', false)).toEqual([c('hearts', 5), c('clubs', 9)]);
  });

  it('allows the restricted suit once broken', () => {
    const hand = [c('spades', 2), c('hearts', 5)];
    expect(leadMoves(hand, 'spades', true)).toEqual(hand);
  });

  it('allows leading the restricted suit when the hand is all of it', () => {
    const hand = [c('spades', 2), c('spades', 'K')];
    expect(leadMoves(hand, 'spades', false)).toEqual(hand);
  });

  it('no restriction (null) allows anything', () => {
    const hand = [c('spades', 2), c('hearts', 5)];
    expect(leadMoves(hand, null, false)).toEqual(hand);
  });
});
