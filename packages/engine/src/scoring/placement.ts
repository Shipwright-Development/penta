import type { PlayerId } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import type { RankingDirection } from '../types/game';
import type { PlayerScores } from './types';
import { zeroScores } from './util';

/** Placement points by finishing position: 1st, 2nd, 3rd, 4th. */
export const PLACEMENT_POOL = [5, 3, 2, 0] as const;

/**
 * Placement points from final game standings, in the game's own ranking
 * direction. Tied players share the sum of the positions they occupy, split
 * evenly (e.g. two tied for 1st take (5 + 3) / 2 = 4 each, and the next player
 * is 3rd). Values are exact — the caller rounds only for display.
 *
 * The distributed points always sum to 10 (= 5 + 3 + 2 + 0) in exact
 * arithmetic, regardless of ties. See scoring.md.
 */
export function placementPoints(totals: PlayerScores, direction: RankingDirection): PlayerScores {
  // Order players best-first for this game's direction.
  const ordered: PlayerId[] = [...PLAYER_IDS].sort((a, b) =>
    direction === 'high' ? totals[b] - totals[a] : totals[a] - totals[b],
  );

  const points = zeroScores();
  let i = 0;
  while (i < ordered.length) {
    // Extend the tie group [i, j) while totals match.
    let j = i + 1;
    while (j < ordered.length && totals[ordered[j]] === totals[ordered[i]]) j++;

    // Everyone in the group shares the pool for positions i..j-1.
    let poolSum = 0;
    for (let k = i; k < j; k++) poolSum += PLACEMENT_POOL[k];
    const share = poolSum / (j - i);
    for (let k = i; k < j; k++) points[ordered[k]] = share;

    i = j;
  }
  return points;
}
