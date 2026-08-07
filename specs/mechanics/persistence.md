# Spec — Persistence

Phase 1 saves and resumes a full in-progress batu ([[penta-project/specs/main|Main Spec]], Decided). A batu is 20 rounds across 5 games — an hour or more of four people's time — so losing one to a closed tab is not an acceptable failure.

## What Gets Saved

The complete engine state, and nothing else:

- Batu state: nicknames, seat order, current round and game, dealer, the full score sheet with markers, accumulated penta scores.
- The active game module's state via its `serialize` ([[penta-project/specs/modules/game-modules|Game Modules]]) — including hidden information.
- Settings that affect play, e.g. whether undo is enabled.

**Not saved:** anything about which screen was open, scroll positions, or animation state. On resume the UI is rebuilt from engine state alone. This keeps the save format independent of the UI, which is what lets phase 2 reuse it.

## When

After every confirmed move, and after every round and game boundary. Writes are debounced but must flush before the app backgrounds — a save that only happens on clean exit doesn't help, because the failure mode is never a clean exit.

## Storage

- One save slot. Phase 1 plays one batu at a time; starting a new batu overwrites, behind a confirmation if an unfinished batu exists.
- `@react-native-async-storage/async-storage` — one API across Expo web, iOS, and Android, backed by `localStorage` on web. The engine must not import it; persistence lives in the app layer and takes serialized state from the engine.

## Format

```
{
  schemaVersion: number,
  savedAt: ISO-8601 string,
  appVersion: string,
  batu: { ...engine state, including the module's serialized state }
}
```

JSON-safe throughout: no `Map`, `Set`, `Date`, or class instances in serialized output. Modules convert to plain structures in `serialize` and back in `deserialize`.

## Version Mismatch and Corruption

Phase 1 has no real users, so **no migration machinery**. A save whose `schemaVersion` doesn't match the running build, or that fails to parse, is discarded — the app says the saved game is from an older version and offers to start fresh, rather than half-loading and corrupting a score sheet mid-batu. Bump `schemaVersion` on any breaking change to engine or module state.

This is a deliberate phase-1-only shortcut. Revisit before anyone outside the group is playing.

## Resume Behaviour

- Reopening with a valid save goes to the **handoff screen for whoever was next** — never straight into a private view, or the wrong person sees a hand ([[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]]).
- Show a brief "resuming round 3 of Hearts" confirmation so the table agrees the state is right before play continues.
- Undo history is **not** persisted. After a resume the last move is final.

## Test Targets

- Round-trip property test per module: arbitrary reachable state → `serialize` → `deserialize` → identical state, hidden information included.
- Full-batu test: save and reload after every single move of a complete batu; final scores must match an uninterrupted run.
- A save with a bumped `schemaVersion` is rejected cleanly rather than partially loaded.
