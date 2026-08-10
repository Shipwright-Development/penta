import type { PlayerId, GameId } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import type { DealContext, RoundResult } from '../types/game';
import type { Card } from '../types/card';
import type { Rng } from '../rng';
import { pick } from '../rng';
import { dealForGame } from '../card/deck';
import { pentaTally, pentaStandings, champion as championOf } from '../scoring/penta';
import type { PlayerScores } from '../scoring/types';
import { nextDealer } from './rotation';
import { GAME_ORDER } from './state';
import type { BatuState, BatuSettings, ModuleRegistry, Phase } from './state';

/** Bump on any breaking change to BatuState or a module's serialized shape. */
export const BATU_SCHEMA_VERSION = 1;

export interface EngineOptions {
  modules: ModuleRegistry;
  rng: Rng;
  /** Per-game deal validity (Trump's all-four-suits check). Absent ⇒ any deal. */
  dealValidators?: Partial<Record<GameId, (hands: Record<PlayerId, Card[]>) => boolean>>;
}

export interface SerializedBatu {
  schemaVersion: number;
  players: [string, string, string, string];
  settings: BatuSettings;
  roundIndex: 0 | 1 | 2 | 3;
  gameIndex: 0 | 1 | 2 | 3 | 4;
  dealer: PlayerId;
  sheet: Record<GameId, RoundResult[]>;
  pentaTallies: BatuState['pentaTallies'];
  lastLosers: PlayerId[];
  phase: Phase;
  active: { gameId: GameId; state: unknown } | null;
}

export interface Engine {
  /** A fresh batu with a random first dealer, awaiting the first deal. */
  create(players: [string, string, string, string], settings?: Partial<BatuSettings>): BatuState;
  /** Deal the upcoming game and set up its module. Requires phase 'awaiting-deal'. */
  startNextGame(state: BatuState): BatuState;
  pendingPlayers(state: BatuState): PlayerId[];
  legalMoves(state: BatuState, player: PlayerId): unknown[];
  applyMove(state: BatuState, player: PlayerId, move: unknown): BatuState;
  /** Revert the last move within the current game (one step). No-op if disabled or none. */
  undo(state: BatuState): BatuState;
  isBatuOver(state: BatuState): boolean;
  standings(state: BatuState): PlayerScores;
  champion(state: BatuState): PlayerId[];
  serialize(state: BatuState): SerializedBatu;
  deserialize(data: unknown): BatuState;
}

function emptySheet(): Record<GameId, RoundResult[]> {
  return { trump: [], seven: [], hearts: [], rumpun: [], capsa: [] };
}

export function createEngine(options: EngineOptions): Engine {
  const { modules, rng, dealValidators = {} } = options;

  const create: Engine['create'] = (players, settings) => ({
    players,
    settings: { undoEnabled: settings?.undoEnabled ?? true },
    roundIndex: 0,
    gameIndex: 0,
    dealer: pick(PLAYER_IDS, rng),
    sheet: emptySheet(),
    pentaTallies: {},
    lastLosers: [],
    active: null,
    phase: 'awaiting-deal',
    undoSnapshot: null,
  });

  const startNextGame: Engine['startNextGame'] = (state) => {
    if (state.phase !== 'awaiting-deal') {
      throw new Error(`startNextGame requires phase 'awaiting-deal', got '${state.phase}'`);
    }
    const gameId = GAME_ORDER[state.gameIndex];
    const mod = modules[gameId];
    const { hands } = dealForGame(state.dealer, rng, dealValidators[gameId]);
    const ctx: DealContext = { hands, dealer: state.dealer, roundIndex: state.roundIndex };
    return {
      ...state,
      active: { gameId, state: mod.setup(ctx) },
      phase: 'playing',
      undoSnapshot: null,
    };
  };

  const pendingPlayers: Engine['pendingPlayers'] = (state) => {
    if (state.phase !== 'playing' || !state.active) return [];
    return modules[state.active.gameId].pendingPlayers(state.active.state);
  };

  const legalMoves: Engine['legalMoves'] = (state, player) => {
    if (state.phase !== 'playing' || !state.active) return [];
    return modules[state.active.gameId].legalMoves(state.active.state, player);
  };

  const applyMove: Engine['applyMove'] = (state, player, move) => {
    if (state.phase !== 'playing' || !state.active) {
      throw new Error(`applyMove requires phase 'playing', got '${state.phase}'`);
    }
    const { gameId } = state.active;
    const mod = modules[gameId];
    const nextModuleState = mod.applyMove(state.active.state, player, move);

    // Mid-game move: keep a one-step undo snapshot and stay in the game.
    if (!mod.isRoundOver(nextModuleState)) {
      return {
        ...state,
        active: { gameId, state: nextModuleState },
        undoSnapshot: { ...state, undoSnapshot: null },
      };
    }

    // Round over: record the result, tally if it's this game's 4th round,
    // rotate the dealer, and advance. Undo is discarded at this boundary.
    const result = mod.roundResult(nextModuleState);
    const sheet = { ...state.sheet, [gameId]: [...state.sheet[gameId], result] };
    const pentaTallies = { ...state.pentaTallies };
    if (state.roundIndex === 3) {
      pentaTallies[gameId] = pentaTally(sheet[gameId], mod.rankingDirection);
    }

    let gameIndex = state.gameIndex + 1;
    let roundIndex = state.roundIndex;
    if (gameIndex > 4) {
      gameIndex = 0;
      roundIndex += 1;
    }
    const over = roundIndex > 3;

    return {
      ...state,
      sheet,
      pentaTallies,
      lastLosers: result.losers,
      gameIndex: over ? state.gameIndex : (gameIndex as BatuState['gameIndex']),
      roundIndex: over ? state.roundIndex : (roundIndex as BatuState['roundIndex']),
      dealer: over ? state.dealer : nextDealer(result.losers, rng),
      active: null,
      phase: over ? 'batu-end' : 'awaiting-deal',
      undoSnapshot: null,
    };
  };

  const undo: Engine['undo'] = (state) => {
    if (!state.settings.undoEnabled) return state;
    return state.undoSnapshot ?? state;
  };

  const isBatuOver: Engine['isBatuOver'] = (state) => state.phase === 'batu-end';

  const standings: Engine['standings'] = (state) =>
    pentaStandings(Object.values(state.pentaTallies));

  const champion: Engine['champion'] = (state) => championOf(standings(state));

  const serialize: Engine['serialize'] = (state) => ({
    schemaVersion: BATU_SCHEMA_VERSION,
    players: state.players,
    settings: state.settings,
    roundIndex: state.roundIndex,
    gameIndex: state.gameIndex,
    dealer: state.dealer,
    sheet: state.sheet,
    pentaTallies: state.pentaTallies,
    lastLosers: state.lastLosers,
    phase: state.phase,
    active: state.active
      ? {
          gameId: state.active.gameId,
          state: modules[state.active.gameId].serialize(state.active.state),
        }
      : null,
  });

  const deserialize: Engine['deserialize'] = (data) => {
    const d = data as SerializedBatu;
    if (d.schemaVersion !== BATU_SCHEMA_VERSION) {
      throw new Error(`save schemaVersion ${d.schemaVersion} != engine ${BATU_SCHEMA_VERSION}`);
    }
    return {
      players: d.players,
      settings: d.settings,
      roundIndex: d.roundIndex,
      gameIndex: d.gameIndex,
      dealer: d.dealer,
      sheet: d.sheet,
      pentaTallies: d.pentaTallies,
      lastLosers: d.lastLosers,
      phase: d.phase,
      active: d.active
        ? { gameId: d.active.gameId, state: modules[d.active.gameId].deserialize(d.active.state) }
        : null,
      undoSnapshot: null,
    };
  };

  return {
    create,
    startNextGame,
    pendingPlayers,
    legalMoves,
    applyMove,
    undo,
    isBatuOver,
    standings,
    champion,
    serialize,
    deserialize,
  };
}
