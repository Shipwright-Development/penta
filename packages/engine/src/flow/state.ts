import type { Card, PlayerId, GameId } from '../types/card';
import type { GameModule, RoundResult } from '../types/game';
import type { PentaBreakdown } from '../scoring/types';

/** The middle-card flip that decided the first-card recipient, for the ritual. */
export interface DealRitual {
  dealer: PlayerId;
  middleCard: Card;
  firstRecipient: PlayerId;
}

/** The five games, in the fixed order every round plays them. */
export const GAME_ORDER: readonly GameId[] = ['trump', 'seven', 'hearts', 'rumpun', 'capsa'];

/**
 * A module whose state/move types are erased for storage. The flow engine
 * holds five different modules and only ever hands each one state it produced,
 * so the concrete S/M don't matter here — `any` is the standard escape hatch
 * for a heterogeneous plugin registry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameModule = GameModule<any, any>;

/** One module per game slot. */
export type ModuleRegistry = Record<GameId, AnyGameModule>;

export type Phase =
  | 'awaiting-deal' // between games: dealer known, cards not yet dealt
  | 'playing' // a game is in progress
  | 'batu-end'; // all 20 games done

export interface BatuSettings {
  undoEnabled: boolean;
}

export interface ActiveGame {
  gameId: GameId;
  /** The active module's live state. Opaque to the flow engine. */
  state: unknown;
}

export interface BatuState {
  players: [string, string, string, string]; // nicknames, indexed by seat
  settings: BatuSettings;
  roundIndex: 0 | 1 | 2 | 3;
  gameIndex: 0 | 1 | 2 | 3 | 4;
  dealer: PlayerId;
  /** Recorded round results per game, one entry per completed round. */
  sheet: Record<GameId, RoundResult[]>;
  /** Penta tally per game, filled once that game's 4th round is scored. */
  pentaTallies: Partial<Record<GameId, PentaBreakdown>>;
  /** ▼ recipients of the game just finished — the dealer-rotation pool. */
  lastLosers: PlayerId[];
  /** The most recent dealing ritual, for the dealing screen. */
  lastDeal: DealRitual | null;
  active: ActiveGame | null;
  phase: Phase;
  /**
   * One-step undo: the state before the last move within the current game.
   * Never serialized, and cleared at every round boundary.
   */
  undoSnapshot: BatuState | null;
}
