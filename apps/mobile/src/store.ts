import { create } from 'zustand';
import {
  createTrumpModule,
  trumpDealValid,
  dealForGame,
  PLAYER_IDS,
  type PlayerId,
  type TrumpState,
  type TrumpMove,
} from '@penta/engine';

/** Single module instance — its methods are pure, it holds no state itself. */
export const trump = createTrumpModule();

export interface RoundSettings {
  undoEnabled: boolean;
}

/** A completed trick, captured for the public "trick won" moment. */
export interface LastTrick {
  plays: { player: PlayerId; card: TrumpState['hands'][PlayerId][number] }[];
  winner: PlayerId;
}

interface RoundStore {
  names: string[];
  settings: RoundSettings;
  dealer: PlayerId;
  state: TrumpState | null;
  /** One-step undo snapshot of the state before the last move. */
  prev: TrumpState | null;
  revealed: boolean; // is the current private view unlocked?
  ritualSeen: boolean; // dealing ritual acknowledged
  bidsSeen: boolean; // bid-reveal moment acknowledged
  lastTrick: LastTrick | null; // pending public trick result

  start: (names: string[], settings: RoundSettings) => void;
  seeRitual: () => void;
  reveal: () => void;
  seeBids: () => void;
  apply: (player: PlayerId, move: TrumpMove) => void;
  clearLastTrick: () => void;
  undo: () => void;
  reset: () => void;
}

export const useRound = create<RoundStore>((set, get) => ({
  names: [],
  settings: { undoEnabled: true },
  dealer: 0,
  state: null,
  prev: null,
  revealed: false,
  ritualSeen: false,
  bidsSeen: false,
  lastTrick: null,

  start: (names, settings) => {
    const dealer = Math.floor(Math.random() * 4) as PlayerId;
    const { hands } = dealForGame(dealer, Math.random, trumpDealValid);
    set({
      names,
      settings,
      dealer,
      state: trump.setup({ hands, dealer, roundIndex: 0 }),
      prev: null,
      revealed: false,
      ritualSeen: false,
      bidsSeen: false,
      lastTrick: null,
    });
  },

  seeRitual: () => set({ ritualSeen: true }),
  reveal: () => set({ revealed: true }),
  seeBids: () => set({ bidsSeen: true }),

  apply: (player, move) => {
    const prev = get().state;
    if (!prev) return;
    const next = trump.applyMove(prev, player, move);

    // Capture a completed trick so the table can show it before moving on.
    let lastTrick: LastTrick | null = null;
    if (move.type === 'play' && next.tricksPlayed === prev.tricksPlayed + 1 && prev.currentTrick) {
      const plays = [...prev.currentTrick.plays, { player, card: move.card }];
      const winner = PLAYER_IDS.find((p) => next.tricksWon[p] === prev.tricksWon[p] + 1) ?? player;
      lastTrick = { plays, winner };
    }

    set({ state: next, prev, revealed: false, lastTrick });
  },

  clearLastTrick: () => set({ lastTrick: null }),

  undo: () => {
    const { prev, settings } = get();
    if (!settings.undoEnabled || !prev) return;
    set({ state: prev, prev: null, revealed: true, lastTrick: null });
  },

  reset: () =>
    set({
      state: null,
      prev: null,
      revealed: false,
      ritualSeen: false,
      bidsSeen: false,
      lastTrick: null,
    }),
}));
