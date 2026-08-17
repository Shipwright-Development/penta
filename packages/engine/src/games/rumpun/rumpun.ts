import type { Card, Suit, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import type { GameModule, DealContext, RoundResult } from '../../types/game';
import type { PlayerScores } from '../../scoring/types';
import { zeroScores } from '../../scoring/util';
import { roundMarkers } from '../../scoring/markers';
import { STANDARD_CARD_RANK, STANDARD_SUIT_RANK, RUMPUN_CARD_VALUE } from '../../card/ordering';
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

export type RumpunMove = { type: 'play'; card: Card };

/** A blind-stacked pile: face-down cards beneath a single face-up top. */
export interface Pile {
  down: Card[];
  up: Card | null;
}

export interface RumpunState {
  hands: Record<PlayerId, Card[]>; // 4 playable hand cards each
  piles: Record<PlayerId, Pile[]>; // 3 piles each
  trumpSuit: Suit;
  currentTrick: TrickState | null; // null once all 13 tricks are done
  trumpBroken: boolean;
  trickNumber: number;
  taken: Record<PlayerId, Card[]>;
  /** Pile tops played this trick, flipped up-from-under after it resolves. */
  pendingReveals: { player: PlayerId; pileIndex: number }[];
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function cloneHands(hands: Record<PlayerId, Card[]>): Record<PlayerId, Card[]> {
  return { 0: [...hands[0]], 1: [...hands[1]], 2: [...hands[2]], 3: [...hands[3]] };
}

function clonePiles(piles: Record<PlayerId, Pile[]>): Record<PlayerId, Pile[]> {
  const out = {} as Record<PlayerId, Pile[]>;
  for (const p of PLAYER_IDS)
    out[p] = piles[p].map((pile) => ({ down: [...pile.down], up: pile.up }));
  return out;
}

function removeCard(hand: readonly Card[], card: Card): Card[] {
  const i = hand.findIndex((c) => sameCard(c, card));
  if (i < 0) throw new Error('card not in hand');
  return [...hand.slice(0, i), ...hand.slice(i + 1)];
}

/** Playable cards: this player's face-up pile tops plus their hand. */
function playable(state: RumpunState, player: PlayerId): Card[] {
  const ups = state.piles[player].map((pile) => pile.up).filter((c): c is Card => c !== null);
  return [...ups, ...state.hands[player]];
}

/** Trump = the highest face-up pile top, by rank then suit; its holder leads. */
function determineTrump(piles: Record<PlayerId, Pile[]>): { suit: Suit; holder: PlayerId } {
  let best: { card: Card; player: PlayerId } | null = null;
  for (const p of PLAYER_IDS) {
    for (const pile of piles[p]) {
      if (!pile.up) continue;
      if (
        best === null ||
        STANDARD_CARD_RANK[pile.up.rank] > STANDARD_CARD_RANK[best.card.rank] ||
        (STANDARD_CARD_RANK[pile.up.rank] === STANDARD_CARD_RANK[best.card.rank] &&
          STANDARD_SUIT_RANK[pile.up.suit] > STANDARD_SUIT_RANK[best.card.suit])
      ) {
        best = { card: pile.up, player: p };
      }
    }
  }
  if (!best) throw new Error('no face-up card to set trump');
  return { suit: best.card.suit, holder: best.player };
}

function playCard(state: RumpunState, player: PlayerId, card: Card): RumpunState {
  const trick = state.currentTrick;
  if (!trick) throw new Error('no active trick');

  const hands = cloneHands(state.hands);
  const piles = clonePiles(state.piles);
  let pendingReveals = state.pendingReveals;

  const fromHand = hands[player].some((c) => sameCard(c, card));
  if (fromHand) {
    hands[player] = removeCard(hands[player], card);
  } else {
    const pi = piles[player].findIndex((pile) => pile.up && sameCard(pile.up, card));
    if (pi < 0) throw new Error('card is not playable');
    piles[player][pi] = { down: piles[player][pi].down, up: null };
    pendingReveals = [...pendingReveals, { player, pileIndex: pi }];
  }

  const isTrump = card.suit === state.trumpSuit;
  const trumpBroken = state.trumpBroken || isTrump;
  // Trump from hand is hidden; trump from a face-up pile top is already known.
  const faceDown = isTrump && fromHand;
  const updated: TrickState = {
    leader: trick.leader,
    plays: [...trick.plays, { player, card, faceDown }],
  };

  if (!isTrickComplete(updated)) {
    return { ...state, hands, piles, pendingReveals, currentTrick: updated, trumpBroken };
  }

  // Trick resolves: dump cards score to the winner too (they're in the trick).
  const winner = trickWinner(updated, state.trumpSuit);
  const taken = {
    ...state.taken,
    [winner]: [...state.taken[winner], ...updated.plays.map((pl) => pl.card)],
  };

  // Reveal the card under every pile top that was played this trick.
  for (const { player: owner, pileIndex } of pendingReveals) {
    const pile = piles[owner][pileIndex];
    piles[owner][pileIndex] = {
      down: pile.down.slice(0, -1),
      up: pile.down[pile.down.length - 1] ?? null,
    };
  }

  const trickNumber = state.trickNumber + 1;
  const done = trickNumber === 13;
  return {
    ...state,
    hands,
    piles,
    pendingReveals: [],
    currentTrick: done ? null : newTrick(winner),
    trumpBroken,
    taken,
    trickNumber,
  };
}

export function createRumpunModule(): GameModule<RumpunState, RumpunMove> {
  return {
    id: 'rumpun',
    rankingDirection: 'high',

    setup(ctx: DealContext): RumpunState {
      const piles = {} as Record<PlayerId, Pile[]>;
      const hands = {} as Record<PlayerId, Card[]>;
      for (const p of PLAYER_IDS) {
        const cards = ctx.hands[p];
        hands[p] = cards.slice(0, 4);
        piles[p] = [
          { down: [cards[4], cards[5]], up: cards[6] },
          { down: [cards[7], cards[8]], up: cards[9] },
          { down: [cards[10], cards[11]], up: cards[12] },
        ];
      }
      const { suit, holder } = determineTrump(piles);
      return {
        hands,
        piles,
        trumpSuit: suit,
        currentTrick: newTrick(holder),
        trumpBroken: false,
        trickNumber: 0,
        taken: { 0: [], 1: [], 2: [], 3: [] },
        pendingReveals: [],
      };
    },

    pendingPlayers(state) {
      return state.currentTrick ? [nextToPlay(state.currentTrick)] : [];
    },

    legalMoves(state, player) {
      if (!state.currentTrick || nextToPlay(state.currentTrick) !== player) return [];
      const cards = playable(state, player);
      const led = ledSuit(state.currentTrick);
      const options =
        led === null
          ? leadMoves(cards, state.trumpSuit, state.trumpBroken)
          : followSuitMoves(cards, led);
      return options.map((card) => ({ type: 'play', card }));
    },

    applyMove(state, player, move) {
      if (!state.currentTrick) throw new Error('round is over');
      if (nextToPlay(state.currentTrick) !== player) throw new Error('not this player’s turn');
      if (move.type !== 'play') throw new Error('expected a card play');
      const legal = this.legalMoves(state, player) as { type: 'play'; card: Card }[];
      if (!legal.some((m) => sameCard(m.card, move.card))) throw new Error('illegal card');
      return playCard(state, player, move.card);
    },

    isRoundOver(state) {
      return state.currentTrick === null;
    },

    roundResult(state): RoundResult {
      const scores: PlayerScores = zeroScores();
      for (const p of PLAYER_IDS) {
        scores[p] = state.taken[p].reduce((sum, card) => sum + RUMPUN_CARD_VALUE[card.rank], 0);
      }
      const { winners, losers } = roundMarkers(scores, 'high');
      return { scores, winners, losers };
    },

    publicView(state) {
      return {
        trumpSuit: state.trumpSuit,
        trumpBroken: state.trumpBroken,
        trickNumber: state.trickNumber,
        currentTrick: state.currentTrick,
        piles: PLAYER_IDS.map((p) =>
          state.piles[p].map((pile) => ({ up: pile.up, down: pile.down.length })),
        ),
      };
    },

    privateView(state, player) {
      return { hand: state.hands[player] };
    },

    serialize(state): unknown {
      return JSON.parse(JSON.stringify(state));
    },

    deserialize(data): RumpunState {
      return JSON.parse(JSON.stringify(data)) as RumpunState;
    },
  };
}
