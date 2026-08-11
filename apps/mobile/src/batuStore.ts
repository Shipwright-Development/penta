import { create } from 'zustand';
import {
  trickWinner,
  type BatuState,
  type BatuSettings,
  type PlayerId,
  type GameId,
  type Card,
  type RoundResult,
} from '@penta/engine';
import { engine, modules, saveBatu, loadBatu, clearSave } from './engine';

export interface CompletedTrick {
  plays: { player: PlayerId; card: Card }[];
  winner: PlayerId;
}

export interface SummaryInfo {
  gameId: GameId;
  roundIndex: number;
  result: RoundResult;
}

/**
 * A recent move, for the history panel. Hidden information (secret bids,
 * passed cards, face-down discards) is summarised, never revealed here.
 */
export interface MoveLog {
  player: PlayerId;
  gameId: GameId;
  kind: 'play' | 'pass' | 'pass3' | 'bid' | 'adjust' | 'discard';
  cards?: Card[];
  amount?: number;
}

function logEntry(gameId: GameId, player: PlayerId, move: unknown): MoveLog {
  const m = move as { type: string; cards?: Card[]; card?: Card; amount?: number };
  if (m.type === 'bid') return { player, gameId, kind: 'bid' };
  if (m.type === 'adjust') return { player, gameId, kind: 'adjust', amount: m.amount };
  if (m.type === 'discard') return { player, gameId, kind: 'discard' };
  if (m.type === 'pass') return { player, gameId, kind: gameId === 'hearts' ? 'pass3' : 'pass' };
  const cards = m.cards ?? (m.card ? [m.card] : []);
  return { player, gameId, kind: 'play', cards };
}

interface BatuStore {
  batu: BatuState | null;
  names: string[];
  revealed: boolean; // is the private view unlocked?
  ritualPending: boolean; // show the dealing ritual after a deal
  trumpBidsSeen: boolean; // Trump bid-reveal acknowledged this game
  lastTrick: CompletedTrick | null; // public trick result awaiting acknowledgement
  summaryPending: SummaryInfo | null; // round summary awaiting acknowledgement
  tallyPending: GameId | null; // penta tally awaiting acknowledgement (after round 4)
  selection: Card[]; // multi-card selection (Capsa combo, Hearts pass, Trump bid)
  overlay: 'none' | 'sheet' | 'standings' | 'menu' | 'history'; // public overlay on top of play
  sortMode: 'suit' | 'rank'; // how hands are sorted for display
  history: MoveLog[]; // recent moves, newest last

  newBatu: (names: string[], settings: BatuSettings) => void;
  resume: () => boolean;
  deal: () => void;
  reveal: () => void;
  acceptRitual: () => void;
  acceptBids: () => void;
  apply: (move: unknown) => void;
  clearTrick: () => void;
  acceptSummary: () => void;
  acceptTally: () => void;
  undo: () => void;
  toggleSelect: (card: Card) => void;
  selectOne: (card: Card) => void;
  clearSelection: () => void;
  finishSevenDiscards: () => void;
  setOverlay: (overlay: BatuStore['overlay']) => void;
  setSortMode: (mode: BatuStore['sortMode']) => void;
  abandon: () => void;
}

interface PublicTrickView {
  currentTrick?: { leader: PlayerId; plays: { player: PlayerId; card: Card }[] } | null;
  trumpSuit?: string | null;
}

/** Reconstruct a just-completed trick (for the public trick-result moment). */
function captureTrick(before: BatuState, player: PlayerId, move: unknown): CompletedTrick | null {
  if (!before.active) return null;
  const gid = before.active.gameId;
  if (gid !== 'trump' && gid !== 'hearts' && gid !== 'rumpun') return null;
  if (typeof move !== 'object' || move === null || (move as { type?: string }).type !== 'play') {
    return null;
  }
  const card = (move as { card?: Card }).card;
  if (!card) return null;

  const pub = modules[gid].publicView(before.active.state as never) as PublicTrickView;
  const trick = pub.currentTrick;
  if (!trick || trick.plays.length !== 3) return null;

  const plays = [...trick.plays, { player, card }];
  const trumpSuit = (pub.trumpSuit ?? null) as Card['suit'] | null;
  return { plays, winner: trickWinner({ leader: trick.leader, plays }, trumpSuit) };
}

export const useBatu = create<BatuStore>((set, get) => ({
  batu: null,
  names: [],
  revealed: false,
  ritualPending: false,
  trumpBidsSeen: false,
  lastTrick: null,
  summaryPending: null,
  tallyPending: null,
  selection: [],
  overlay: 'none',
  sortMode: 'suit',
  history: [],

  newBatu: (names, settings) => {
    const batu = engine.create(names as [string, string, string, string], settings);
    saveBatu(batu);
    set({
      batu,
      names,
      revealed: false,
      ritualPending: false,
      trumpBidsSeen: false,
      lastTrick: null,
      summaryPending: null,
      tallyPending: null,
      selection: [],
      overlay: 'none',
      history: [],
    });
  },

  resume: () => {
    const batu = loadBatu();
    if (!batu) return false;
    set({
      batu,
      names: batu.players,
      revealed: false, // never resume into a private view
      ritualPending: false,
      trumpBidsSeen: true, // if mid-game, bids were already revealed
      lastTrick: null,
      summaryPending: null,
      tallyPending: null,
      selection: [],
      overlay: 'none',
      history: [],
    });
    return true;
  },

  deal: () => {
    const batu = get().batu;
    if (!batu || batu.phase !== 'awaiting-deal') return;
    const next = engine.startNextGame(batu);
    saveBatu(next);
    set({
      batu: next,
      ritualPending: true,
      revealed: false,
      trumpBidsSeen: false,
      selection: [],
      lastTrick: null,
    });
  },

  reveal: () => set({ revealed: true }),
  acceptRitual: () => set({ ritualPending: false }),
  acceptBids: () => set({ trumpBidsSeen: true }),

  apply: (move) => {
    const batu = get().batu;
    if (!batu) return;
    const player = engine.pendingPlayers(batu)[0];
    const gameId = batu.active?.gameId;
    const trick = captureTrick(batu, player, move);
    const next = engine.applyMove(batu, player, move);
    saveBatu(next);

    const history = gameId
      ? [...get().history, logEntry(gameId, player, move)].slice(-12)
      : get().history;

    let summaryPending = get().summaryPending;
    let tallyPending = get().tallyPending;
    if (batu.active && batu.phase === 'playing' && next.phase !== 'playing') {
      const gid = batu.active.gameId;
      const results = next.sheet[gid];
      summaryPending = {
        gameId: gid,
        roundIndex: batu.roundIndex,
        result: results[results.length - 1],
      };
      if (batu.roundIndex === 3) tallyPending = gid;
    }

    set({
      batu: next,
      revealed: false,
      selection: [],
      lastTrick: trick,
      summaryPending,
      tallyPending,
      history,
    });
  },

  clearTrick: () => set({ lastTrick: null }),
  acceptSummary: () => set({ summaryPending: null }),
  acceptTally: () => set({ tallyPending: null }),

  undo: () => {
    const batu = get().batu;
    if (!batu) return;
    const prev = engine.undo(batu);
    if (prev === batu) return;
    saveBatu(prev);
    set({ batu: prev, revealed: true, selection: [], lastTrick: null });
  },

  toggleSelect: (card) => {
    const selection = get().selection;
    const has = selection.some((c) => c.suit === card.suit && c.rank === card.rank);
    set({
      selection: has
        ? selection.filter((c) => !(c.suit === card.suit && c.rank === card.rank))
        : [...selection, card],
    });
  },
  selectOne: (card) =>
    set((s) => ({
      selection: s.selection.some((c) => c.suit === card.suit && c.rank === card.rank)
        ? []
        : [card],
    })),
  clearSelection: () => set({ selection: [] }),

  // Seven only: once nobody can play, discard every remaining card and finish.
  // Discards only sum for scoring, so which card each seat sheds and in what
  // order is irrelevant — this is score-identical to playing it all out.
  finishSevenDiscards: () => {
    const start = get().batu;
    if (!start || start.active?.gameId !== 'seven') return;
    let batu = start;
    let guard = 0;
    while (batu.active?.gameId === 'seven' && batu.phase === 'playing' && guard++ < 100) {
      const player = engine.pendingPlayers(batu)[0];
      if (player === undefined) break;
      const priv = modules.seven.privateView(batu.active.state as never, player) as {
        hand: Card[];
      };
      if (priv.hand.length === 0) break;
      batu = engine.applyMove(batu, player, { type: 'discard', card: priv.hand[0] });
    }
    saveBatu(batu);

    let summaryPending = get().summaryPending;
    let tallyPending = get().tallyPending;
    if (start.phase === 'playing' && batu.phase !== 'playing') {
      const results = batu.sheet.seven;
      summaryPending = {
        gameId: 'seven',
        roundIndex: start.roundIndex,
        result: results[results.length - 1],
      };
      if (start.roundIndex === 3) tallyPending = 'seven';
    }
    set({ batu, revealed: false, selection: [], lastTrick: null, summaryPending, tallyPending });
  },

  setOverlay: (overlay) => set({ overlay }),
  setSortMode: (sortMode) => set({ sortMode }),
  abandon: () => {
    clearSave();
    set({ batu: null, overlay: 'none' });
  },
}));

/** The seat the engine is currently waiting on, or null. */
export function currentPlayer(batu: BatuState): PlayerId | null {
  return engine.pendingPlayers(batu)[0] ?? null;
}
