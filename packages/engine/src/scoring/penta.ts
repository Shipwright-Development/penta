import type { PlayerId } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import type { RoundResult, RankingDirection } from '../types/game';
import type { PlayerScores, PentaBreakdown } from './types';
import { cumulativeScores, markerTally } from './round';
import { placementPoints } from './placement';
import { zeroScores } from './util';

/**
 * A game's penta tally, run after its 4th round. Rank by final game score in
 * the game's direction for placement points, then adjust by markers
 * (+1 per □, −1 per ▼). Returned split so the math stays auditable.
 */
export function pentaTally(
  rounds: readonly RoundResult[],
  direction: RankingDirection,
): PentaBreakdown {
  const totals = cumulativeScores(rounds);
  const { squares, triangles } = markerTally(rounds);
  const placement = placementPoints(totals, direction);

  const markers = zeroScores();
  const penta = zeroScores();
  for (const p of PLAYER_IDS) {
    markers[p] = squares[p] - triangles[p];
    penta[p] = placement[p] + markers[p];
  }
  return { placement, markers, penta };
}

/** Penta standings: the sum of penta points across all tallied games. */
export function pentaStandings(tallies: readonly PentaBreakdown[]): PlayerScores {
  const acc = zeroScores();
  for (const tally of tallies) {
    for (const p of PLAYER_IDS) acc[p] += tally.penta[p];
  }
  return acc;
}

/**
 * The batu champion(s): the player(s) with the highest penta score. Returns
 * more than one when scores tie — a shared victory.
 */
export function champion(standings: PlayerScores): PlayerId[] {
  const best = Math.max(...PLAYER_IDS.map((p) => standings[p]));
  return PLAYER_IDS.filter((p) => standings[p] === best);
}
