import {
  createEngine,
  createTrumpModule,
  createSevenModule,
  createHeartsModule,
  createRumpunModule,
  createCapsaModule,
  trumpDealValid,
  type BatuState,
  type PlayerId,
  type GameId,
} from '@penta/engine';

/** The five real modules, keyed for both the engine and view-side introspection. */
export const modules = {
  trump: createTrumpModule(),
  seven: createSevenModule(),
  hearts: createHeartsModule(),
  rumpun: createRumpunModule(),
  capsa: createCapsaModule(),
} as const;

export const engine = createEngine({
  modules,
  rng: Math.random,
  dealValidators: { trump: trumpDealValid },
});

/** The active module's public view (safe for the shared screen). */
export function activePublicView(batu: BatuState): unknown {
  if (!batu.active) return null;
  // The registry is heterogeneous; the engine only ever pairs a module with
  // state it produced, so the erased `never` cast is safe.
  return modules[batu.active.gameId].publicView(batu.active.state as never);
}

/** The active module's private view for one player (only behind a handoff). */
export function activePrivateView(batu: BatuState, player: PlayerId): unknown {
  if (!batu.active) return null;
  return modules[batu.active.gameId].privateView(batu.active.state as never, player);
}

export function activeGameId(batu: BatuState): GameId | null {
  return batu.active?.gameId ?? null;
}

// ---------------------------------------------------------------------------
// Persistence — app layer only (the engine never touches storage). One slot,
// localStorage-backed on web. Phase 2 swaps this for AsyncStorage; the JSON
// envelope is what carries forward. A schema mismatch throws and is discarded.
// ---------------------------------------------------------------------------

const SAVE_KEY = 'penta-save';

interface SaveEnvelope {
  savedAt: string;
  batu: unknown;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveBatu(batu: BatuState): void {
  const store = storage();
  if (!store) return;
  const envelope: SaveEnvelope = {
    savedAt: new Date().toISOString(),
    batu: engine.serialize(batu),
  };
  try {
    store.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // Best-effort; a failed save just means resume is unavailable.
  }
}

export function loadBatu(): BatuState | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as SaveEnvelope;
    return engine.deserialize(envelope.batu); // throws on schema mismatch
  } catch {
    // Corrupt or from an older build — discard rather than half-load.
    clearSave();
    return null;
  }
}

export function hasSave(): boolean {
  const store = storage();
  return !!store && store.getItem(SAVE_KEY) !== null;
}

export function clearSave(): void {
  storage()?.removeItem(SAVE_KEY);
}
