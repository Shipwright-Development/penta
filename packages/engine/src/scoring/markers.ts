import type { PlayerId } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import type { RankingDirection } from '../types/game';
import type { PlayerScores } from './types';

/**
 * □ (winners) and ▼ (losers) for one round, given the game's ranking direction.
 * A tie for best or worst yields several recipients; when all four scores are
 * equal, neither marker is awarded (see penta.md / scoring.md).
 */
export function roundMarkers(
  scores: PlayerScores,
  direction: RankingDirection,
): { winners: PlayerId[]; losers: PlayerId[] } {
  const values = PLAYER_IDS.map((p) => scores[p]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return { winners: [], losers: [] };

  const best = direction === 'high' ? max : min;
  const worst = direction === 'high' ? min : max;
  return {
    winners: PLAYER_IDS.filter((p) => scores[p] === best),
    losers: PLAYER_IDS.filter((p) => scores[p] === worst),
  };
}
