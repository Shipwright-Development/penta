import type { Card, Rank, Suit, PlayerId } from '../../types/card';
import { PLAYER_IDS } from '../../types/card';
import type { GameModule, DealContext, RoundResult } from '../../types/game';
import type { PlayerScores } from '../../scoring/types';
import { zeroScores } from '../../scoring/util';
import { roundMarkers } from '../../scoring/markers';
import { SEVEN_DISCARD_VALUE, SEVEN_ACE_VALUE } from '../../card/ordering';
import type { AceConvention } from '../../card/ordering';

/** A play names the card; an ace also names which end (both may be legal). */
export type SevenMove =
  { type: 'play'; card: Card; end?: 'above' | 'below' } | { type: 'discard'; card: Card };

/** A suit's line, built out from its 7. Aces cap an end per the convention. */
export interface SuitLine {
  opened: boolean;
  lowNonAce: Rank | null; // lowest non-ace rank present (2..K)
  highNonAce: Rank | null; // highest non-ace rank present (2..K)
  aceLow: boolean; // ace placed below the 2
  aceHigh: boolean; // ace placed above the K
}

export interface SevenState {
  roundIndex: 0 | 1 | 2 | 3;
  startingSuit: Suit;
  hands: Record<PlayerId, Card[]>;
  lines: Record<Suit, SuitLine>;
  convention: AceConvention; // 'none' until the first ace is placed
  currentPlayer: PlayerId;
  turnsTaken: number; // 0..52
  discards: Record<PlayerId, Card[]>;
}

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const STARTING_SUIT: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']; // by round
const NON_ACE: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];

function nonAceIndex(rank: Rank): number {
  return NON_ACE.indexOf(rank);
}
function rankUp(rank: Rank): Rank | null {
  const i = nonAceIndex(rank);
  return i >= 0 && i < NON_ACE.length - 1 ? NON_ACE[i + 1] : null;
}
function rankDown(rank: Rank): Rank | null {
  const i = nonAceIndex(rank);
  return i > 0 ? NON_ACE[i - 1] : null;
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function cloneState(state: SevenState): SevenState {
  return JSON.parse(JSON.stringify(state)) as SevenState;
}

function removeFromHand(hand: Card[], card: Card): void {
  const i = hand.findIndex((c) => sameCard(c, card));
  if (i < 0) throw new Error('card not in hand');
  hand.splice(i, 1);
}

function holderOfSeven(hands: Record<PlayerId, Card[]>, suit: Suit): PlayerId {
  return PLAYER_IDS.find((p) => hands[p].some((c) => c.suit === suit && c.rank === 7)) ?? 0;
}

/** A collapsed line reaches a terminal for the current convention → dead. */
function collapsed(line: SuitLine, convention: AceConvention): boolean {
  if (!line.opened) return false;
  if (convention === 'above') return line.aceHigh || line.lowNonAce === 2;
  if (convention === 'under') return line.highNonAce === 'K' || line.aceLow;
  return false; // 'none' — no terminals yet
}

/** The play moves available this turn (opening 7s and line extensions). */
function legalPlays(state: SevenState, player: PlayerId): SevenMove[] {
  const hand = state.hands[player];
  const has = (suit: Suit, rank: Rank) => hand.some((c) => c.suit === suit && c.rank === rank);
  const plays: SevenMove[] = [];

  for (const suit of SUITS) {
    const line = state.lines[suit];

    if (!line.opened) {
      if (has(suit, 7)) plays.push({ type: 'play', card: { suit, rank: 7 } });
      continue;
    }
    if (collapsed(line, state.convention)) continue;

    // Extend up, or cap with an ace above the K.
    if (line.highNonAce !== 'K') {
      const up = rankUp(line.highNonAce as Rank);
      if (up !== null && has(suit, up)) plays.push({ type: 'play', card: { suit, rank: up } });
    } else if (
      (state.convention === 'none' || state.convention === 'above') &&
      !line.aceHigh &&
      has(suit, 'A')
    ) {
      plays.push({ type: 'play', card: { suit, rank: 'A' }, end: 'above' });
    }

    // Extend down, or cap with an ace below the 2.
    if (line.lowNonAce !== 2) {
      const down = rankDown(line.lowNonAce as Rank);
      if (down !== null && has(suit, down))
        plays.push({ type: 'play', card: { suit, rank: down } });
    } else if (
      (state.convention === 'none' || state.convention === 'under') &&
      !line.aceLow &&
      has(suit, 'A')
    ) {
      plays.push({ type: 'play', card: { suit, rank: 'A' }, end: 'below' });
    }
  }
  return plays;
}

function advance(state: SevenState): void {
  state.currentPlayer = ((state.currentPlayer + 1) % 4) as PlayerId;
  state.turnsTaken += 1;
}

export function createSevenModule(): GameModule<SevenState, SevenMove> {
  return {
    id: 'seven',
    rankingDirection: 'low',

    setup(ctx: DealContext): SevenState {
      const startingSuit = STARTING_SUIT[ctx.roundIndex];
      const lines = {} as Record<Suit, SuitLine>;
      for (const suit of SUITS) {
        lines[suit] = {
          opened: false,
          lowNonAce: null,
          highNonAce: null,
          aceLow: false,
          aceHigh: false,
        };
      }
      return {
        roundIndex: ctx.roundIndex,
        startingSuit,
        hands: {
          0: [...ctx.hands[0]],
          1: [...ctx.hands[1]],
          2: [...ctx.hands[2]],
          3: [...ctx.hands[3]],
        },
        lines,
        convention: 'none',
        currentPlayer: holderOfSeven(ctx.hands, startingSuit),
        turnsTaken: 0,
        discards: { 0: [], 1: [], 2: [], 3: [] },
      };
    },

    pendingPlayers(state) {
      return state.turnsTaken < 52 ? [state.currentPlayer] : [];
    },

    legalMoves(state, player) {
      if (state.turnsTaken >= 52 || player !== state.currentPlayer) return [];

      // The very first turn is the forced starting-suit 7.
      if (state.turnsTaken === 0) {
        return [{ type: 'play', card: { suit: state.startingSuit, rank: 7 } }];
      }

      const plays = legalPlays(state, player);
      if (plays.length > 0) return plays; // must play if you can
      return state.hands[player].map((card) => ({ type: 'discard', card })); // otherwise discard
    },

    applyMove(state, player, move) {
      if (state.turnsTaken >= 52) throw new Error('round is over');
      if (player !== state.currentPlayer) throw new Error('not this player’s turn');

      const legal = this.legalMoves(state, player) as SevenMove[];
      const matches = (m: SevenMove) =>
        m.type === move.type &&
        sameCard(m.card, move.card) &&
        (m.type === 'play' && move.type === 'play' ? m.end === move.end : true);
      if (!legal.some(matches)) throw new Error('illegal move');

      const next = cloneState(state);

      if (move.type === 'discard') {
        removeFromHand(next.hands[player], move.card);
        next.discards[player].push(move.card);
        advance(next);
        return next;
      }

      const { card } = move;
      const line = next.lines[card.suit];
      if (card.rank === 7 && !line.opened) {
        next.lines[card.suit] = {
          opened: true,
          lowNonAce: 7,
          highNonAce: 7,
          aceLow: false,
          aceHigh: false,
        };
      } else if (card.rank === 'A') {
        if (move.end === 'above') {
          line.aceHigh = true;
          if (next.convention === 'none') next.convention = 'above';
        } else {
          line.aceLow = true;
          if (next.convention === 'none') next.convention = 'under';
        }
      } else if (line.highNonAce !== null && card.rank === rankUp(line.highNonAce)) {
        line.highNonAce = card.rank;
      } else if (line.lowNonAce !== null && card.rank === rankDown(line.lowNonAce)) {
        line.lowNonAce = card.rank;
      } else {
        throw new Error('card does not extend this line');
      }

      removeFromHand(next.hands[player], card);
      advance(next);
      return next;
    },

    isRoundOver(state) {
      return state.turnsTaken >= 52;
    },

    roundResult(state): RoundResult {
      const aceValue = SEVEN_ACE_VALUE[state.convention];
      const scores: PlayerScores = zeroScores();
      for (const p of PLAYER_IDS) {
        scores[p] = state.discards[p].reduce(
          (sum, card) => sum + (card.rank === 'A' ? aceValue : SEVEN_DISCARD_VALUE[card.rank]),
          0,
        );
      }
      const { winners, losers } = roundMarkers(scores, 'low');
      return { scores, winners, losers };
    },

    publicView(state) {
      return {
        startingSuit: state.startingSuit,
        convention: state.convention,
        currentPlayer: state.currentPlayer,
        turnsTaken: state.turnsTaken,
        lines: state.lines,
        discardCounts: PLAYER_IDS.map((p) => state.discards[p].length),
      };
    },

    privateView(state, player) {
      return { hand: state.hands[player], myDiscards: state.discards[player] };
    },

    serialize(state): unknown {
      return JSON.parse(JSON.stringify(state));
    },

    deserialize(data): SevenState {
      return JSON.parse(JSON.stringify(data)) as SevenState;
    },
  };
}
