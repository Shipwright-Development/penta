import type { PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import type { PlayerScores } from '../../scoring/types';
import { zeroScores } from '../../scoring/util';

export interface TrumpScoringInput {
  /** Target tricks after any exactly-13 adjustment (== original if none). */
  finalBids: PlayerScores;
  tricksWon: PlayerScores;
  /** True only for a genuine 0-bid *as originally made* (a single J/Q/K). */
  wasZeroBid: Record<PlayerId, boolean>;
}

/**
 * Trump round scores. The three zero-adjacent cases are kept distinct, in this
 * precedence:
 *
 *  1. Any bid pushed below 0 (whatever it started as) → −5, then −2 per trick won.
 *  2. A genuine, unadjusted 0-bid → +5 for taking none, else −5 for the first
 *     trick and −2 for each additional.
 *  3. Everything else (normal bids, a raised 0-bidder, a bid *adjusted to* 0) →
 *     exact bid scores the bid; a miss is penalised by the over/under-13 rule.
 *
 * Over/under is read from the adjusted total: over 13 costs −1 per trick over
 * and −2 per trick under; under 13 swaps them. The total is never exactly 13
 * (an original 13 forces a 4·d adjustment away from it).
 */
export function trumpScores(input: TrumpScoringInput): PlayerScores {
  const { finalBids, tricksWon, wasZeroBid } = input;
  const total = PLAYER_IDS.reduce<number>((s, p) => s + finalBids[p], 0);
  const overThirteen = total > 13;

  const scores = zeroScores();
  for (const p of PLAYER_IDS) {
    const target = finalBids[p];
    const won = tricksWon[p];

    if (target < 0) {
      scores[p] = -5 - 2 * won;
    } else if (wasZeroBid[p] && target === 0) {
      scores[p] = won === 0 ? 5 : -5 - 2 * (won - 1);
    } else if (won === target) {
      scores[p] = target;
    } else {
      const over = Math.max(won - target, 0);
      const under = Math.max(target - won, 0);
      scores[p] = overThirteen ? -over - 2 * under : -under - 2 * over;
    }
  }
  return scores;
}
