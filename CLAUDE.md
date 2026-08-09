# CLAUDE.md — Penta Codebase

Implementation of **Penta**, a compound card game for 4 players: 5 games over 4 rounds. One full game is a *batu*.

This file is an index and a short list of things that are easy to get wrong. **It deliberately does not restate rules or specs** — a second copy of a fact is a copy that will eventually disagree with the first. Everything below points at where the answer actually lives.

## Docs Here Are Read-Only Copies

- **`rules/`** — the authoritative ruleset, copied from the vault.
- **`specs/`** — approved specs, copied from the vault.
- **`scripts/`, and all code** — belong to this repo, edit freely.

**Never edit anything under `rules/` or `specs/`.** They are overwritten on the next handoff and your changes vanish. If implementation reveals a gap or contradiction: stop and raise it, don't invent a rule to unblock yourself. The fix is made in the vault, re-approved, and re-copied by `scripts/handoff.sh`.

Copies are byte-identical to the vault so `diff` reveals drift immediately. That's why they still contain Obsidian wikilinks:

- `[[penta-project/specs/mechanics/scoring|Scoring]]` → `specs/mechanics/scoring.md`
- `[[penta-project/game-rule/penta|penta.md]]` → `rules/penta.md`
- a bare `[[trump|Trump]]` inside a rules file → `rules/games/trump.md`
- anything pointing at `dev-link` is vault-only — ignore it

**`rules/` wins over `specs/` wins over code comments, always.**

## Where to Look

| Question | File |
|---|---|
| What counts as finished? | `specs/main.md` |
| Batu lifecycle, dealing, dealer rotation, who leads | `specs/mechanics/game-flow.md` |
| Scoring, ranking direction, ties, the score sheet | `specs/mechanics/scoring.md` |
| Hand-checked scoring fixtures — write these tests first | `specs/mechanics/worked-examples.md` |
| Save format, resume, versioning | `specs/mechanics/persistence.md` |
| The module interface every game implements | `specs/modules/game-modules.md` |
| Screens, privacy model, platform, presentation | `specs/phases/pass-and-play-ui.md` |
| How any individual game actually plays | `rules/games/<game>.md` |

**Before implementing any game module, read its entry under "Per-Game Implementation Notes" in `specs/modules/game-modules.md`.** That section lists the traps for each game — bid tiebreaks, trick-resolution cases, ace conventions, bomb and pass behaviour. They are there because each one was ambiguous enough to need an explicit ruling.

## Architecture

npm workspaces monorepo. Stack, tooling and versions: `specs/` plus the vault's `dev-link.md`.

- **`packages/engine`** — pure TypeScript, **zero UI dependencies**. Card model, batu flow, scoring, and the five games as modules behind one interface. The no-UI-deps rule is what makes the engine reusable for phase 2; it's enforced by the package having nothing UI-related to import.
- **`apps/mobile`** — Expo (React Native + react-native-web). **Phase 1 builds and tests the web target only** — a page played on a PC or laptop. Native stays available so phase 2 needs no rewrite; nothing about it is in scope now.
- **State:** Zustand. **Tests:** Vitest for the engine. **TypeScript strict** throughout.

### Non-negotiables

- **The UI never computes legality or score.** It renders what `legalMoves` returns and displays what scoring reports. If the UI is deciding something, it's a bug.
- **Every state change flows through the engine.**
- **Ranking direction is per-game** — modules declare it, the tally never hardcodes it. Getting this wrong silently inverts a leaderboard.
- **Module state serializes losslessly**, hidden information included. Phase 1 resumes an interrupted batu mid-round.
- **No hardcoded English.** The UI is bilingual from the first screen; every string goes through i18n.
- **Cards are drawn in code** (SVG/CSS). No image assets.

## Scope

Phase 1 is pass & play on one device, web only. Phase 2 is online multiplayer reusing this engine unchanged. Bots and accounts come later. Don't build for phase 2 — but don't put UI concerns in the engine either, because phase 2 is exactly why that line exists. Details in `specs/main.md`.
