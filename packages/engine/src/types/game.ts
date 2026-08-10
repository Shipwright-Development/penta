import type { Card, PlayerId, GameId } from './card.js';

export interface DealContext {
  hands: Record<PlayerId, Card[]>;
  dealer: PlayerId;
  /** Seven's starting suit and Hearts' pass direction key off this. */
  roundIndex: 0 | 1 | 2 | 3;
}

export interface RoundResult {
  scores: Record<PlayerId, number>;
  winners: PlayerId[]; // □ recipients — 0 entries when all four tie
  losers: PlayerId[];  // ▼ recipients — 0 entries when all four tie
}

export interface GameModule<S, M> {
  readonly id: GameId;
  /** Which direction places 1st. Scoring reads this; the tally never hardcodes it. */
  readonly rankingDirection: 'high' | 'low';

  setup(ctx: DealContext): S;

  /**
   * Who the engine is waiting on. Normally one player. Returns several during
   * simultaneous phases (Trump bidding, Hearts passing), which pass & play
   * collects one at a time behind separate handoff screens.
   * Empty once the round is over.
   */
  pendingPlayers(state: S): PlayerId[];

  /** The only source of move legality. The UI renders exactly this and nothing else. */
  legalMoves(state: S, player: PlayerId): M[];

  /** Pure: returns new state, never mutates. Rejects a move not in legalMoves. */
  applyMove(state: S, player: PlayerId, move: M): S;

  isRoundOver(state: S): boolean;
  roundResult(state: S): RoundResult;

  /** Safe for the shared screen — table cards, trick in progress, revealed piles. */
  publicView(state: S): unknown;

  /** Only ever rendered behind a handoff screen, for that player alone. */
  privateView(state: S, player: PlayerId): unknown;

  serialize(state: S): unknown;   // must be JSON-safe
  deserialize(data: unknown): S;
}
