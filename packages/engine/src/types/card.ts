export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';
export interface Card {
  suit: Suit;
  rank: Rank;
}

/** Seat index, clockwise. Fixed for the whole batu. */
export type PlayerId = 0 | 1 | 2 | 3;

/** All four seats, in clockwise order. */
export const PLAYER_IDS: readonly PlayerId[] = [0, 1, 2, 3];

export type GameId = 'trump' | 'seven' | 'hearts' | 'rumpun' | 'capsa';
