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
  - [[penta-project/specs/mechanics/worked-examples|Worked Examples]] — hand-checked scoring fixtures; first unit tests
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

## Build Order

Guidance, not contract — the definition of done above is the contract. But the sequence matters: three of the five games share a trick-taking core, and the module interface should be proven before four modules are written against it.

Two principles drive the order. **Test the highest-bug-density code before any game exists** — scoring and its tie handling need no game logic at all and have hand-checked fixtures waiting. And **prove the whole stack vertically before going wide** — one game playable on screen beats five games playable only in tests.

| # | Stage | Done when |
|---|---|---|
| 1 | **Foundations.** Scaffold the monorepo, tooling, scripts. **Pin the Expo SDK version** in `package.json` and record it in `dev-link.md`. Shared types and card model per [[penta-project/specs/modules/game-modules|Game Modules]]: cards, seats, deck, shuffle, per-game rank and suit orderings. | The web target boots, tests and lint run, and Capsa's inverted suit order and Rumpun's rank-vs-value split are both expressed in types. |
| 2 | **Scoring.** The whole two-tier system: round recording, cumulative game scores, markers, placement, ties, penta tally. Needs **no game logic whatsoever**. | Worked examples 4 and 5 pass, plus property tests on the tie shapes. This is where the bugs live — get it right while it's isolated. |
| 3 | **Flow engine + persistence**, driven by a stub module returning canned results. Batu sequencing, dealing, the middle-card rule, dealer rotation including the no-▼ fallback, undo, save/resume. | A fake 20-round batu runs end to end, and saving/reloading after every move produces identical final scores. |
| 4 | **Trick-taking core + Trump.** The first real module, and the hardest: simultaneous bidding, exactly-13, three-tier tiebreak, three zero-adjacent cases. | Worked examples 1, 2 and 2b pass; a Trump round plays out headless. |
| 5 | **UI vertical slice.** Handoff screen, hand view, table, bid entry, round summary — enough to play one Trump round on screen, i18n wired from the first string. | Four people can play a round of Trump on a laptop without seeing each other's hands. This is the first moment the design is real rather than described. |
| 6 | **Capsa Banting.** Deliberately next, not last: it is the most structurally different game — shedding, not tricks; combinations; pass lock-out; bombs. If the module interface doesn't generalise, this is what reveals it. | Capsa plays through the same UI shell with only module-level additions. If the interface needed changing, better to learn it now with two modules written than with four. |
| 7 | **Hearts**, then **Rumpun.** Both reuse the trick core; Hearts adds passing and moon detection, Rumpun adds pile reveals and the three-case trick resolution. | Worked example 3 passes; Rumpun never confuses card rank with card value. |
| 8 | **Seven.** Last of the five — a line/adjacency model sharing least with the others, plus the ace convention as a genuine player choice. | Both ace placements appear in `legalMoves` until one is played. |
| 9 | **Full UI.** Remaining screens per [[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]], score sheet, penta tally breakdown, champion, resume UX, complete i18n pass in both languages. | Every screen in the inventory exists and nothing renders a hardcoded string. |
| 10 | **Acceptance.** A full batu played through the app against the recorded paper batu. | Numbers match. See the definition of done above. |

Raise, don't invent, if a stage reveals a rules gap — the correction is made in the vault and re-copied.

## Design Principles

- **Rules live in the vault, once.** The engine implements `penta-project/game-rule/`; any rules gap gets fixed there first (see [[penta-project/dev-link|dev-link]]).
- **Engine and UI stay separate.** Game logic must be UI-agnostic so phase 2 reuses it unchanged.
- **Every game state change flows through the engine** — the UI never computes scores or legality itself.

## Open Questions

No rules or design questions remain. Two gaps are **missing artefacts rather than undecided questions**, both needing something only the table can supply:

- **A recorded batu.** The definition of done below requires the app's numbers to match a hand-scored batu; none is recorded. Transcribe one into [[penta-project/specs/mechanics/worked-examples|Worked Examples]] §6.
- **A photo of the paper score sheet**, to replace the reconstructed layout in [[penta-project/specs/mechanics/scoring|Scoring]].

## Decided

- Tech stack (2026-07-26): npm workspace monorepo, `packages/engine` (pure TS) + `apps/mobile` (Expo, web/iOS/Android). See [[penta-project/dev-link|dev-link.md]] "Tech Stack".
- Ranking direction is per-game and declared by the module (2026-08-07) — Trump and Rumpun rank high, Seven/Hearts/Capsa rank low. See [[penta-project/specs/mechanics/scoring|Scoring]].
- All-four-tied round awards no markers (2026-08-07); dealer rotation falls back to a random pick. See [[penta-project/game-rule/penta|penta.md]].
- Undo is in scope for pass & play and bots, off-limits online, toggleable (2026-08-07). See [[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]].
- Phase 1 saves and resumes a full in-progress batu (2026-08-07). Every module's state must be serializable — this is an engine-interface constraint from day one, not a feature bolted on later. See [[penta-project/specs/modules/game-modules|Game Modules]].
