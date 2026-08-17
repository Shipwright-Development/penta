import type { PlayerId } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import type { Rng } from '../rng';
import { pick } from '../rng';

/**
 * The next game's dealer is a ▼ recipient of the game just finished, chosen at
 * random if several. When nobody got ▼ (an all-four-tied round), fall back to a
 * random pick from all four players. See game-flow.md, Dealer Rotation.
 */
export function nextDealer(losers: readonly PlayerId[], rng: Rng): PlayerId {
  const pool = losers.length > 0 ? losers : PLAYER_IDS;
  return pick(pool, rng);
}
