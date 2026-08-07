# Penta — Main Spec

## Summary

An online playable version of **Penta**, a 4-player compound card game (5 games × 4 rounds = one *batu*). Rules are fully documented at [[penta-project/game-rule/penta|penta.md]] — specs never restate rules, they reference them.

## Phases

| Phase | Scope |
|---|---|
| **1 — Pass & Play (PoC)** | Single device, 4 human players take turns holding it. Nicknames only, no accounts. Full batu playable with automated scoring. |
| **2 — Online Multiplayer** | Friends join a room and play from their own devices. |
| **Later** | AI bots to fill empty seats; accounts & match history. |

Phase 1 is the proof of concept: if the game engine, flow, and scoring work on one device, phase 2 is largely a networking/UI layer on top of the same engine.

## Spec Structure

Specs are organized by folder:

- **`mechanics/`** — cross-cutting systems shared by all games
  - [[penta-project/specs/mechanics/game-flow|Game Flow]] — batu lifecycle: rounds, game order, dealing, dealer rotation
  - [[penta-project/specs/mechanics/scoring|Scoring]] — game scores, □/▼ markers, penta score tally
- **`modules/`** — the playable games themselves
  - [[penta-project/specs/modules/game-modules|Game Modules]] — the five games as pluggable modules on a shared engine
- **`phases/`** — phase-specific deliverables
  - [[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]] — phase 1 interface: device passing, hidden information, privacy
  - [[penta-project/specs/phases/future-phases|Future Phases]] — online multiplayer, bots, accounts (stubs to expand later)

## Design Principles

- **Rules live in the vault, once.** The engine implements `penta-project/game-rule/`; any rules gap gets fixed there first (see [[penta-project/dev-link|dev-link]]).
- **Engine and UI stay separate.** Game logic must be UI-agnostic so phase 2 reuses it unchanged.
- **Every game state change flows through the engine** — the UI never computes scores or legality itself.

## Open Questions

- *(none currently)*

## Decided

- Tech stack (2026-07-26): npm workspace monorepo, `packages/engine` (pure TS) + `apps/mobile` (Expo, web/iOS/Android). See [[penta-project/dev-link|dev-link.md]] "Tech Stack".
- Ranking direction is per-game and declared by the module (2026-08-07) — Trump and Rumpun rank high, Seven/Hearts/Capsa rank low. See [[penta-project/specs/mechanics/scoring|Scoring]].
- All-four-tied round awards no markers (2026-08-07); dealer rotation falls back to a random pick. See [[penta-project/game-rule/penta|penta.md]].
- Undo is in scope for pass & play and bots, off-limits online, toggleable (2026-08-07). See [[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]].
- Phase 1 saves and resumes a full in-progress batu (2026-08-07). Every module's state must be serializable — this is an engine-interface constraint from day one, not a feature bolted on later. See [[penta-project/specs/modules/game-modules|Game Modules]].
