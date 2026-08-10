import type { Card, PlayerId, GameId } from '../types/card';
import { PLAYER_IDS } from '../types/card';
import type { GameModule, DealContext, RoundResult } from '../types/game';
import { zeroScores } from '../scoring/util';
import { GAME_ORDER } from './state';

/**
 * A minimal, deterministic GameModule used to drive and test the flow engine
 * before any real game exists (build order stage 3). Each seat takes exactly
 * one trivial turn clockwise from the dealer; the round result is a fixed
 * function of the round and game, so a batu's final scores are reproducible.
 *
 * Not a real game — never registered in production, only imported by tests.
 */
export interface StubState {
  gameId: GameId;
  roundIndex: 0 | 1 | 2 | 3;
  dealer: PlayerId;
  hands: Record<PlayerId, Card[]>;
  played: PlayerId[];
}

export interface StubMove {
  type: 'play';
}

function opener(dealer: PlayerId, offset: number): PlayerId {
  return ((dealer + offset) % 4) as PlayerId;
}

export function makeStubModule(id: GameId): GameModule<StubState, StubMove> {
  const gameSlot = GAME_ORDER.indexOf(id);

  return {
    id,
    rankingDirection: 'high',

    setup(ctx: DealContext): StubState {
      return {
        gameId: id,
        roundIndex: ctx.roundIndex,
        dealer: ctx.dealer,
        hands: ctx.hands,
        played: [],
      };
    },

    pendingPlayers(state) {
      return state.played.length < 4 ? [opener(state.dealer, state.played.length)] : [];
    },

    legalMoves(state, player) {
      return this.pendingPlayers(state)[0] === player ? [{ type: 'play' }] : [];
    },

    applyMove(state, player, _move) {
      const next = this.pendingPlayers(state)[0];
      if (player !== next) {
        throw new Error(`stub: expected seat ${next} to play, got ${player}`);
      }
      return { ...state, played: [...state.played, player] };
    },

    isRoundOver(state) {
      return state.played.length === 4;
    },

    roundResult(state): RoundResult {
      const scores = zeroScores();
      for (const p of PLAYER_IDS) {
        scores[p] = (p + 1) * (state.roundIndex + 1) + gameSlot;
      }
      const values = PLAYER_IDS.map((p) => scores[p]);
      const max = Math.max(...values);
      const min = Math.min(...values);
      const winners = max === min ? [] : PLAYER_IDS.filter((p) => scores[p] === max);
      const losers = max === min ? [] : PLAYER_IDS.filter((p) => scores[p] === min);
      return { scores, winners, losers };
    },

    publicView(state) {
      return { gameId: state.gameId, played: state.played };
    },

    privateView(state, player) {
      return { hand: state.hands[player] };
    },

    serialize(state): unknown {
      return {
        gameId: state.gameId,
        roundIndex: state.roundIndex,
        dealer: state.dealer,
        hands: state.hands,
        played: state.played,
      };
    },

    deserialize(data): StubState {
      const d = data as StubState;
      return {
        gameId: d.gameId,
        roundIndex: d.roundIndex,
        dealer: d.dealer,
        hands: d.hands,
        played: [...d.played],
      };
    },
  };
}

/** A registry that maps all five game slots to stub modules. */
export function makeStubRegistry(): Record<GameId, GameModule<StubState, StubMove>> {
  return {
    trump: makeStubModule('trump'),
    seven: makeStubModule('seven'),
    hearts: makeStubModule('hearts'),
    rumpun: makeStubModule('rumpun'),
    capsa: makeStubModule('capsa'),
  };
}
