import type { Card, PlayerId } from '../../types/card';
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

export type HeartsPhase = 'passing' | 'playing' | 'done';

export type HeartsMove = { type: 'pass'; cards: Card[] } | { type: 'play'; card: Card };

export interface HeartsState {
  phase: HeartsPhase;
  roundIndex: 0 | 1 | 2 | 3;
  hands: Record<PlayerId, Card[]>;
  /** Pass selections during the passing phase (3 cards each). */
  passSelections: Partial<Record<PlayerId, Card[]>>;
  currentTrick: TrickState | null;
  heartsBroken: boolean;
  trickNumber: number;
  /** Cards captured in won tricks, per player — the scoring source. */
  taken: Record<PlayerId, Card[]>;
}

const TWO_OF_CLUBS: Card = { suit: 'clubs', rank: 2 };
const QUEEN_OF_SPADES: Card = { suit: 'spades', rank: 'Q' };

/** Recipient offset per round: R1 left(+1), R2 right(+3), R3 across(+2), R4 none. */
function passOffset(roundIndex: number): number | null {
  return [1, 3, 2, null][roundIndex] ?? null;
}

function isPenalty(card: Card): boolean {
  return card.suit === 'hearts' || (card.suit === 'spades' && card.rank === 'Q');
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function cloneHands(hands: Record<PlayerId, Card[]>): Record<PlayerId, Card[]> {
  return { 0: [...hands[0]], 1: [...hands[1]], 2: [...hands[2]], 3: [...hands[3]] };
}

function removeCard(hand: readonly Card[], card: Card): Card[] {
  const i = hand.findIndex((c) => sameCard(c, card));
  if (i < 0) throw new Error('card not in hand');
  return [...hand.slice(0, i), ...hand.slice(i + 1)];
}

function* combos3(cards: Card[]): Generator<Card[]> {
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      for (let k = j + 1; k < cards.length; k++) yield [cards[i], cards[j], cards[k]];
}

function heartsHeld(cards: readonly Card[]): number {
  return cards.filter((c) => c.suit === 'hearts').length;
}

function hasQueen(cards: readonly Card[]): boolean {
  return cards.some((c) => sameCard(c, QUEEN_OF_SPADES));
}

function holderOf(hands: Record<PlayerId, Card[]>, card: Card): PlayerId {
  return PLAYER_IDS.find((p) => hands[p].some((c) => sameCard(c, card))) ?? 0;
}

/** Begin the play phase: the 2♣ holder leads it. */
function startPlay(state: HeartsState): HeartsState {
  const leader = holderOf(state.hands, TWO_OF_CLUBS);
  return { ...state, phase: 'playing', currentTrick: newTrick(leader), trickNumber: 0 };
}

/** Resolve all four selected passes simultaneously. */
function executePasses(state: HeartsState): HeartsState {
  const offset = passOffset(state.roundIndex);
  if (offset === null) return state;
  const sel = state.passSelections as Record<PlayerId, Card[]>;

  // Remove every giver's three cards first, then hand them to recipients.
  const hands = cloneHands(state.hands);
  for (const p of PLAYER_IDS) for (const card of sel[p]) hands[p] = removeCard(hands[p], card);
  for (const p of PLAYER_IDS) {
    const recipient = ((p + offset) % 4) as PlayerId;
    hands[recipient] = [...hands[recipient], ...sel[p]];
  }
  return { ...state, hands };
}

function playCard(state: HeartsState, player: PlayerId, card: Card): HeartsState {
  const trick = state.currentTrick;
  if (!trick) throw new Error('no active trick');

  const hands = cloneHands(state.hands);
  hands[player] = removeCard(hands[player], card);
  const heartsBroken = state.heartsBroken || card.suit === 'hearts';
  const updated: TrickState = { leader: trick.leader, plays: [...trick.plays, { player, card }] };

  if (!isTrickComplete(updated)) {
    return { ...state, hands, currentTrick: updated, heartsBroken };
  }

  const winner = trickWinner(updated, null); // no trump in Hearts
  const taken = {
    ...state.taken,
    [winner]: [...state.taken[winner], ...updated.plays.map((p) => p.card)],
  };
  const trickNumber = state.trickNumber + 1;
  if (trickNumber === 13) {
    return { ...state, hands, currentTrick: null, heartsBroken, taken, trickNumber, phase: 'done' };
  }
  return { ...state, hands, currentTrick: newTrick(winner), heartsBroken, taken, trickNumber };
}

export function createHeartsModule(): GameModule<HeartsState, HeartsMove> {
  return {
    id: 'hearts',
    rankingDirection: 'low',

    setup(ctx: DealContext): HeartsState {
      const base: HeartsState = {
        phase: 'passing',
        roundIndex: ctx.roundIndex,
        hands: cloneHands(ctx.hands),
        passSelections: {},
        currentTrick: null,
        heartsBroken: false,
        trickNumber: 0,
        taken: { 0: [], 1: [], 2: [], 3: [] },
      };
      // Round 4 has no passing — go straight to play.
      return passOffset(ctx.roundIndex) === null ? startPlay(base) : base;
    },

    pendingPlayers(state) {
      if (state.phase === 'passing') return PLAYER_IDS.filter((p) => !state.passSelections[p]);
      if (state.phase === 'playing' && state.currentTrick) return [nextToPlay(state.currentTrick)];
      return [];
    },

    legalMoves(state, player) {
      if (state.phase === 'passing') {
        if (state.passSelections[player]) return [];
        return [...combos3(state.hands[player])].map((cards) => ({ type: 'pass', cards }));
      }
      if (state.phase !== 'playing' || !state.currentTrick) return [];
      if (nextToPlay(state.currentTrick) !== player) return [];

      const hand = state.hands[player];
      const led = ledSuit(state.currentTrick);
      const firstTrick = state.trickNumber === 0;

      if (led === null) {
        // Leading. The very first lead is forced to be the 2♣.
        if (firstTrick) return [{ type: 'play', card: TWO_OF_CLUBS }];
        return leadMoves(hand, 'hearts', state.heartsBroken).map((card) => ({
          type: 'play',
          card,
        }));
      }

      let cards = followSuitMoves(hand, led);
      if (firstTrick) {
        const clean = cards.filter((c) => !isPenalty(c));
        if (clean.length > 0) cards = clean; // no penalty cards on trick 1 unless forced
      }
      return cards.map((card) => ({ type: 'play', card }));
    },

    applyMove(state, player, move) {
      if (state.phase === 'passing') {
        if (move.type !== 'pass') throw new Error('expected a pass');
        if (state.passSelections[player]) throw new Error('already passed');
        if (move.cards.length !== 3) throw new Error('must pass exactly three cards');
        for (const card of move.cards) {
          if (!state.hands[player].some((c) => sameCard(c, card)))
            throw new Error('card not in hand');
        }
        const next: HeartsState = {
          ...state,
          passSelections: { ...state.passSelections, [player]: move.cards },
        };
        if (PLAYER_IDS.every((p) => next.passSelections[p])) return startPlay(executePasses(next));
        return next;
      }

      if (state.phase === 'playing') {
        if (move.type !== 'play') throw new Error('expected a card play');
        if (!state.currentTrick || nextToPlay(state.currentTrick) !== player) {
          throw new Error('not this player’s turn');
        }
        const legal = this.legalMoves(state, player) as { type: 'play'; card: Card }[];
        if (!legal.some((m) => sameCard(m.card, move.card))) throw new Error('illegal card');
        return playCard(state, player, move.card);
      }

      throw new Error('round is over');
    },

    isRoundOver(state) {
      return state.phase === 'done';
    },

    roundResult(state): RoundResult {
      const raw = zeroScores();
      for (const p of PLAYER_IDS) {
        raw[p] = heartsHeld(state.taken[p]) + (hasQueen(state.taken[p]) ? 13 : 0);
      }
      const shooter = PLAYER_IDS.find(
        (p) => heartsHeld(state.taken[p]) === 13 && hasQueen(state.taken[p]),
      );

      if (shooter !== undefined) {
        // Moon shot: shooter 0, everyone else 26; □ shooter, ▼ all others.
        const scores = zeroScores();
        for (const p of PLAYER_IDS) scores[p] = p === shooter ? 0 : 26;
        return { scores, winners: [shooter], losers: PLAYER_IDS.filter((p) => p !== shooter) };
      }
      const { winners, losers } = roundMarkers(raw, 'low');
      return { scores: raw, winners, losers };
    },

    publicView(state) {
      return {
        phase: state.phase,
        heartsBroken: state.heartsBroken,
        trickNumber: state.trickNumber,
        currentTrick: state.currentTrick,
        taken: PLAYER_IDS.map((p) => ({
          hearts: heartsHeld(state.taken[p]),
          queen: hasQueen(state.taken[p]),
        })),
      };
    },

    privateView(state, player) {
      return { hand: state.hands[player], myPass: state.passSelections[player] ?? null };
    },

    serialize(state): unknown {
      return JSON.parse(JSON.stringify(state));
    },

    deserialize(data): HeartsState {
      return JSON.parse(JSON.stringify(data)) as HeartsState;
    },
  };
}
