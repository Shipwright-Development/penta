import type { Card, Suit, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import type { GameModule, DealContext, RoundResult } from '../../types/game';
import type { PlayerScores } from '../../scoring/types';
import { zeroScores } from '../../scoring/util';
import { roundMarkers } from '../../scoring/markers';
import type { TrickState } from '../../trick/trick';
import {
  newTrick,
  ledSuit,
  nextToPlay,
  isTrickComplete,
  trickWinner,
  followSuitMoves,
  leadMoves,
} from '../../trick/trick';
import type { Bid } from './bid';
import { bidValue, trumpFromBid, highestBidder, legalBids, isValidBid } from './bid';
import { trumpScores } from './scoring';

export type TrumpPhase = 'bidding' | 'adjustment' | 'playing' | 'done';

export type TrumpMove =
  { type: 'bid'; bid: Bid } | { type: 'adjust'; amount: number } | { type: 'play'; card: Card };

export interface TrumpState {
  phase: TrumpPhase;
  roundIndex: 0 | 1 | 2 | 3;
  dealer: PlayerId;
  hands: Record<PlayerId, Card[]>;
  /** Bids placed so far (bidding phase); revealed together once all four are in. */
  bids: Partial<Record<PlayerId, Bid>>;
  highestBidder: PlayerId | null;
  trumpSuit: Suit | null; // null = No-Trump
  /** Numeric bids as originally made (before any adjustment). */
  originalBids: PlayerScores;
  /** Genuine 0-bid as originally made — drives 0-bid special scoring. */
  wasZeroBid: Record<PlayerId, boolean>;
  finalBids: PlayerScores; // targets after adjustment (== original if none)
  adjustment: number; // d applied (0 if none)
  needsAdjustment: boolean; // original total was exactly 13
  currentTrick: TrickState | null;
  trumpBroken: boolean;
  tricksWon: PlayerScores;
  tricksPlayed: number;
}

const ADJUSTMENT_RANGE = 13; // practical bound for enumerated legalMoves

function boolFlags(): Record<PlayerId, boolean> {
  return { 0: false, 1: false, 2: false, 3: false };
}

function cloneHands(hands: Record<PlayerId, Card[]>): Record<PlayerId, Card[]> {
  return { 0: [...hands[0]], 1: [...hands[1]], 2: [...hands[2]], 3: [...hands[3]] };
}

function removeCard(hand: readonly Card[], card: Card): Card[] {
  const i = hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
  if (i < 0) throw new Error('card not in hand');
  return [...hand.slice(0, i), ...hand.slice(i + 1)];
}

/** Resolve bidding once all four are in: trump, highest bidder, exactly-13 check. */
function resolveBidding(state: TrumpState): TrumpState {
  const bids = state.bids as Record<PlayerId, Bid>;
  const originalBids = zeroScores();
  const wasZeroBid = boolFlags();
  for (const p of PLAYER_IDS) {
    originalBids[p] = bidValue(bids[p]);
    wasZeroBid[p] = originalBids[p] === 0;
  }
  const winner = highestBidder(bids);
  const trumpSuit = trumpFromBid(bids[winner]);
  const total = PLAYER_IDS.reduce<number>((s, p) => s + originalBids[p], 0);

  const base: TrumpState = {
    ...state,
    highestBidder: winner,
    trumpSuit,
    originalBids,
    wasZeroBid,
    finalBids: { ...originalBids },
  };

  if (total === 13) {
    return { ...base, phase: 'adjustment', needsAdjustment: true };
  }
  return { ...base, phase: 'playing', currentTrick: newTrick(winner) };
}

function playCard(state: TrumpState, player: PlayerId, card: Card): TrumpState {
  const trick = state.currentTrick;
  if (!trick) throw new Error('no active trick');

  const hands = cloneHands(state.hands);
  hands[player] = removeCard(hands[player], card);

  const isTrump = state.trumpSuit !== null && card.suit === state.trumpSuit;
  const plays = [...trick.plays, { player, card, faceDown: isTrump }];
  const trumpBroken = state.trumpBroken || isTrump;
  const updated: TrickState = { leader: trick.leader, plays };

  if (!isTrickComplete(updated)) {
    return { ...state, hands, currentTrick: updated, trumpBroken };
  }

  // Trick complete: award it, the winner leads next (or the round ends).
  const winner = trickWinner(updated, state.trumpSuit);
  const tricksWon = { ...state.tricksWon, [winner]: state.tricksWon[winner] + 1 };
  const tricksPlayed = state.tricksPlayed + 1;

  if (tricksPlayed === 13) {
    return {
      ...state,
      hands,
      currentTrick: null,
      trumpBroken,
      tricksWon,
      tricksPlayed,
      phase: 'done',
    };
  }
  return {
    ...state,
    hands,
    currentTrick: newTrick(winner),
    trumpBroken,
    tricksWon,
    tricksPlayed,
  };
}

export function createTrumpModule(): GameModule<TrumpState, TrumpMove> {
  return {
    id: 'trump',
    rankingDirection: 'high',

    setup(ctx: DealContext): TrumpState {
      return {
        phase: 'bidding',
        roundIndex: ctx.roundIndex,
        dealer: ctx.dealer,
        hands: cloneHands(ctx.hands),
        bids: {},
        highestBidder: null,
        trumpSuit: null,
        originalBids: zeroScores(),
        wasZeroBid: boolFlags(),
        finalBids: zeroScores(),
        adjustment: 0,
        needsAdjustment: false,
        currentTrick: null,
        trumpBroken: false,
        tricksWon: zeroScores(),
        tricksPlayed: 0,
      };
    },

    pendingPlayers(state) {
      switch (state.phase) {
        case 'bidding':
          return PLAYER_IDS.filter((p) => state.bids[p] === undefined);
        case 'adjustment':
          return state.highestBidder === null ? [] : [state.highestBidder];
        case 'playing':
          return state.currentTrick ? [nextToPlay(state.currentTrick)] : [];
        case 'done':
          return [];
      }
    },

    legalMoves(state, player) {
      switch (state.phase) {
        case 'bidding':
          if (state.bids[player] !== undefined) return [];
          return legalBids(state.hands[player]).map((bid) => ({ type: 'bid', bid }));
        case 'adjustment': {
          if (player !== state.highestBidder) return [];
          const moves: TrumpMove[] = [];
          for (let d = -ADJUSTMENT_RANGE; d <= ADJUSTMENT_RANGE; d++) {
            if (d !== 0) moves.push({ type: 'adjust', amount: d });
          }
          return moves;
        }
        case 'playing': {
          if (!state.currentTrick || nextToPlay(state.currentTrick) !== player) return [];
          const led = ledSuit(state.currentTrick);
          const hand = state.hands[player];
          const cards =
            led === null
              ? leadMoves(hand, state.trumpSuit, state.trumpBroken)
              : followSuitMoves(hand, led);
          return cards.map((card) => ({ type: 'play', card }));
        }
        case 'done':
          return [];
      }
    },

    applyMove(state, player, move) {
      if (state.phase === 'bidding') {
        if (move.type !== 'bid') throw new Error('expected a bid');
        if (state.bids[player] !== undefined) throw new Error('already bid');
        if (!isValidBid(move.bid, state.hands[player])) throw new Error('illegal bid');
        const next: TrumpState = { ...state, bids: { ...state.bids, [player]: move.bid } };
        const allIn = PLAYER_IDS.every((p) => next.bids[p] !== undefined);
        return allIn ? resolveBidding(next) : next;
      }

      if (state.phase === 'adjustment') {
        if (move.type !== 'adjust') throw new Error('expected an adjustment');
        if (player !== state.highestBidder) throw new Error('only the highest bidder adjusts');
        if (!Number.isInteger(move.amount) || move.amount === 0) {
          throw new Error('adjustment must be a non-zero integer');
        }
        const finalBids = zeroScores();
        for (const p of PLAYER_IDS) finalBids[p] = state.originalBids[p] + move.amount;
        return {
          ...state,
          finalBids,
          adjustment: move.amount,
          phase: 'playing',
          currentTrick: newTrick(state.highestBidder),
        };
      }

      if (state.phase === 'playing') {
        if (move.type !== 'play') throw new Error('expected a card play');
        if (!state.currentTrick || nextToPlay(state.currentTrick) !== player) {
          throw new Error('not this player’s turn');
        }
        const legal = this.legalMoves(state, player) as { type: 'play'; card: Card }[];
        const ok = legal.some(
          (m) => m.card.suit === move.card.suit && m.card.rank === move.card.rank,
        );
        if (!ok) throw new Error('illegal card');
        return playCard(state, player, move.card);
      }

      throw new Error('round is over');
    },

    isRoundOver(state) {
      return state.phase === 'done';
    },

    roundResult(state): RoundResult {
      const scores = trumpScores({
        finalBids: state.finalBids,
        tricksWon: state.tricksWon,
        wasZeroBid: state.wasZeroBid,
      });
      const { winners, losers } = roundMarkers(scores, 'high');
      return { scores, winners, losers };
    },

    publicView(state) {
      // Bids stay secret until all four are in; then trump and targets are shown.
      const revealed = state.phase !== 'bidding';
      return {
        phase: state.phase,
        trumpSuit: revealed ? state.trumpSuit : null,
        highestBidder: revealed ? state.highestBidder : null,
        finalBids: revealed ? state.finalBids : null,
        adjustment: state.adjustment,
        currentTrick: state.currentTrick,
        trumpBroken: state.trumpBroken,
        tricksWon: state.tricksWon,
        tricksPlayed: state.tricksPlayed,
      };
    },

    privateView(state, player) {
      return { hand: state.hands[player], myBid: state.bids[player] ?? null };
    },

    serialize(state): unknown {
      return JSON.parse(JSON.stringify(state));
    },

    deserialize(data): TrumpState {
      return JSON.parse(JSON.stringify(data)) as TrumpState;
    },
  };
}

/** Trump's deal-validity check: every player must hold at least one of each suit. */
export function trumpDealValid(hands: Record<PlayerId, Card[]>): boolean {
  for (const p of PLAYER_IDS) {
    const suits = new Set(hands[p].map((c) => c.suit));
    if (suits.size < 4) return false;
  }
  return true;
}
