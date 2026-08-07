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
  - [[penta-project/specs/mechanics/persistence|Persistence]] — save format, resume behaviour, version handling
- **`modules/`** — the playable games themselves
  - [[penta-project/specs/modules/game-modules|Game Modules]] — the five games as pluggable modules on a shared engine
- **`phases/`** — phase-specific deliverables
  - [[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]] — phase 1 interface: device passing, hidden information, privacy
  - [[penta-project/specs/phases/future-phases|Future Phases]] — online multiplayer, bots, accounts (stubs to expand later)

## Phase 1 — Definition of Done

Phase 1 is finished when all of the following hold. Anything not on this list is out of scope for phase 1, however tempting.

**Playable**

- Four nicknames in, a complete batu out: 5 games × 4 rounds, ending on a champion screen (or a shared victory).
- Every rule in `penta-project/game-rule/` is enforced by the engine. No situation where the table has to house-rule something the app got wrong or refused to allow.
- The score sheet and penta standings are reachable at any point from a public screen.

**Correct**

- One full batu played through the app produces the same numbers as the same batu scored by hand on paper. This is the acceptance test — if they disagree, phase 1 isn't done.
- Property tests on the tie cases: placement splits, multi-□/▼ rounds, the all-four-tied round, moon shots. These are where the bugs live.
- Per-module round-trip serialization tests ([[penta-project/specs/mechanics/persistence|Persistence]]).

**Durable**

- Force-quitting or refreshing at any point in the batu resumes with nothing lost, landing on the correct handoff screen.

**Structurally sound for phase 2**

- `packages/engine` has zero UI dependencies, enforced by the package's own dependency list rather than by discipline.
- The UI computes no legality and no score — it renders `legalMoves` and displays what scoring reports.

**Shipped where**

- **A web page, played on a PC or laptop.** That is the whole of phase 1's target — it must work well in a desktop browser. Mobile and native builds are phase 2; the Expo stack keeps them available without a rewrite, but nothing about them is in scope or tested here.
- Interface is bilingual (English / Indonesian, switchable) with all copy behind an i18n layer. See [[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]].

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
