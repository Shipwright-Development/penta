import type { PlayerId } from '../types/card';

/** A value per seat. Every scoring result carries all four keys. */
export type PlayerScores = Record<PlayerId, number>;

/** Marker counts accumulated over a game's rounds. */
export interface MarkerTally {
  squares: PlayerScores; // □ counts (winners)
  triangles: PlayerScores; // ▼ counts (losers)
}

/**
 * A game's penta tally, kept split so the arithmetic is auditable
 * (placement points + marker adjustment = penta). All values are exact —
 * round only at display time. See scoring.md.
 */
export interface PentaBreakdown {
  placement: PlayerScores; // placement points from final standings
  markers: PlayerScores; // net marker adjustment (□ count − ▼ count)
  penta: PlayerScores; // placement + markers
}
