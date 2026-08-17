import type { PlayerScores } from './types';

/** A fresh PlayerScores with every seat at 0. */
export function zeroScores(): PlayerScores {
  return { 0: 0, 1: 0, 2: 0, 3: 0 };
}
