import type { Card, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import type { GameModule, DealContext, RoundResult } from '../../types/game';
import type { PlayerScores } from '../../scoring/types';
import { zeroScores } from '../../scoring/util';
import { roundMarkers } from '../../scoring/markers';
import type { Combo } from './combo';
import { classify, beats, allCombos } from './combo';

export type CapsaMove = { type: 'play'; cards: Card[] } | { type: 'pass' };

export interface CapsaState {
  hands: Record<PlayerId, Card[]>;
  currentPlayer: PlayerId;
  /** The combo that must be beaten; null when leading fresh. */
  currentCombo: Combo | null;
  /** Who played currentCombo; leads fresh once everyone else has passed. */
  lastPlayer: PlayerId | null;
  /** Seats locked out of the current sequence (passed). */
  passed: PlayerId[];
  /** Has the opening 3♦ play happened yet? */
  opened: boolean;
  /** First player to empty their hand; the round ends the moment this is set. */
  winner: PlayerId | null;
}

const THREE_OF_DIAMONDS: Card = { suit: 'diamonds', rank: 3 };

function cloneHands(hands: Record<PlayerId, Card[]>): Record<PlayerId, Card[]> {
  return { 0: [...hands[0]], 1: [...hands[1]], 2: [...hands[2]], 3: [...hands[3]] };
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function hasCard(hand: readonly Card[], card: Card): boolean {
  return hand.some((c) => sameCard(c, card));
}

function removeCards(hand: readonly Card[], cards: readonly Card[]): Card[] {
  const rest = [...hand];
  for (const card of cards) {
    const i = rest.findIndex((c) => sameCard(c, card));
    if (i < 0) throw new Error('card not in hand');
    rest.splice(i, 1);
  }
  return rest;
}

function comboHasThreeOfDiamonds(combo: Combo): boolean {
  return combo.cards.some((c) => sameCard(c, THREE_OF_DIAMONDS));
}

/** Next seat clockwise that hasn't passed this sequence. */
function nextActive(from: PlayerId, passed: readonly PlayerId[]): PlayerId {
  let p = ((from + 1) % 4) as PlayerId;
  while (passed.includes(p)) p = ((p + 1) % 4) as PlayerId;
  return p;
}

/** Legal combos for the seat on turn, before wrapping them as moves. */
function legalCombos(state: CapsaState, player: PlayerId): Combo[] {
  const combos = allCombos(state.hands[player]);
  if (state.currentCombo === null) {
    // Leading fresh — any valid combo, but the very first play must carry 3♦.
    return state.opened ? combos : combos.filter(comboHasThreeOfDiamonds);
  }
  const target = state.currentCombo;
  return combos.filter((c) => beats(c, target));
}

export function createCapsaModule(): GameModule<CapsaState, CapsaMove> {
  return {
    id: 'capsa',
    rankingDirection: 'low', // fewest cards left is best

    setup(ctx: DealContext): CapsaState {
      const opener = PLAYER_IDS.find((p) => hasCard(ctx.hands[p], THREE_OF_DIAMONDS)) ?? 0;
      return {
        hands: cloneHands(ctx.hands),
        currentPlayer: opener,
        currentCombo: null,
        lastPlayer: null,
        passed: [],
        opened: false,
        winner: null,
      };
    },

    pendingPlayers(state) {
      return state.winner !== null ? [] : [state.currentPlayer];
    },

    legalMoves(state, player) {
      if (state.winner !== null || player !== state.currentPlayer) return [];
      const plays: CapsaMove[] = legalCombos(state, player).map((c) => ({
        type: 'play',
        cards: c.cards,
      }));
      // Passing is illegal when leading fresh (there's nothing to pass on).
      return state.currentCombo === null ? plays : [...plays, { type: 'pass' }];
    },

    applyMove(state, player, move) {
      if (state.winner !== null) throw new Error('round is over');
      if (player !== state.currentPlayer) throw new Error('not this player’s turn');

      if (move.type === 'pass') {
        if (state.currentCombo === null) throw new Error('cannot pass a fresh lead');
        const passed = [...state.passed, player];
        // Everyone but the last player has passed → they lead fresh.
        if (passed.length === 3 && state.lastPlayer !== null) {
          return { ...state, passed: [], currentCombo: null, currentPlayer: state.lastPlayer };
        }
        return { ...state, passed, currentPlayer: nextActive(player, passed) };
      }

      const combo = classify(move.cards);
      if (!combo) throw new Error('not a legal combination');
      for (const card of move.cards) {
        if (!hasCard(state.hands[player], card)) throw new Error('card not in hand');
      }
      if (state.currentCombo === null) {
        if (!state.opened && !comboHasThreeOfDiamonds(combo)) {
          throw new Error('the opening play must include 3♦');
        }
      } else if (!beats(combo, state.currentCombo)) {
        throw new Error('does not beat the current combination');
      }

      const hands = cloneHands(state.hands);
      hands[player] = removeCards(hands[player], move.cards);

      if (hands[player].length === 0) {
        return { ...state, hands, winner: player, currentCombo: combo, lastPlayer: player };
      }
      return {
        ...state,
        hands,
        currentCombo: combo,
        lastPlayer: player,
        opened: true,
        currentPlayer: nextActive(player, state.passed),
      };
    },

    isRoundOver(state) {
      return state.winner !== null;
    },

    roundResult(state): RoundResult {
      const scores: PlayerScores = zeroScores();
      for (const p of PLAYER_IDS) scores[p] = state.hands[p].length; // winner has 0
      const { winners, losers } = roundMarkers(scores, 'low');
      return { scores, winners, losers };
    },

    publicView(state) {
      return {
        counts: PLAYER_IDS.map((p) => state.hands[p].length),
        currentPlayer: state.currentPlayer,
        currentCombo: state.currentCombo,
        lastPlayer: state.lastPlayer,
        passed: state.passed,
        opened: state.opened,
        winner: state.winner,
      };
    },

    privateView(state, player) {
      return { hand: state.hands[player] };
    },

    serialize(state): unknown {
      return JSON.parse(JSON.stringify(state));
    },

    deserialize(data): CapsaState {
      return JSON.parse(JSON.stringify(data)) as CapsaState;
    },
  };
}
