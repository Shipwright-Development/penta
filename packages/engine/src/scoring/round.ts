import { PLAYER_IDS } from '../types/card';
import type { RoundResult } from '../types/game';
import type { PlayerScores, MarkerTally } from './types';
import { zeroScores } from './util';

/**
 * Cumulative game score: the running sum of round scores per player.
 * This is the number the penta tally ranks.
 */
export function cumulativeScores(rounds: readonly RoundResult[]): PlayerScores {
  const acc = zeroScores();
  for (const round of rounds) {
    for (const p of PLAYER_IDS) acc[p] += round.scores[p];
  }
  return acc;
}

/**
 * Count □ (winners) and ▼ (losers) across a game's rounds. A round may award
 * several of either (ties, moon shot) or none at all (all four tied), so this
 * just accumulates whatever each RoundResult reports — it never re-derives them.
 */
export function markerTally(rounds: readonly RoundResult[]): MarkerTally {
  const squares = zeroScores();
  const triangles = zeroScores();
  for (const round of rounds) {
    for (const p of round.winners) squares[p] += 1;
    for (const p of round.losers) triangles[p] += 1;
  }
  return { squares, triangles };
}
