# CLAUDE.md — Penta Codebase

Implementation of **Penta**, a compound card game for 4 players: 5 games played over 4 rounds. One full game is a *batu*.

This repo is the **code**. The design work lives in an Obsidian vault outside it. That separation is deliberate — read the next section before changing any `.md` file here.

## Docs in This Repo Are Copies

Two folders here are **read-only snapshots** handed off from the vault:

- **`rules/`** — the authoritative ruleset. `penta.md` (batu structure, dealing, scoring) plus one file per game in `rules/games/`.
- **`specs/`** — approved specs. `main.md` is the index; `mechanics/`, `modules/`, and `phases/` hold the rest.

**Never edit files in `rules/` or `specs/`.** They are overwritten on the next handoff, and your changes vanish. If implementation reveals a gap, contradiction, or a better idea:

1. Stop and raise it — don't invent a rule to unblock yourself.
2. The fix is made in the vault, re-approved, and re-copied here.
3. Then implement.

Copies are byte-identical to the vault on purpose, so a diff reveals drift immediately. That's also why they still contain Obsidian wikilinks: `[[penta-project/specs/mechanics/scoring|Scoring]]` means `specs/mechanics/scoring.md` here, and `[[penta-project/game-rule/penta|penta.md]]` means `rules/penta.md`. Links to `dev-link` point at a vault-only file — ignore them.

`rules/` wins over `specs/` wins over code comments, always.

## Architecture

npm workspaces monorepo:

- **`packages/engine`** — pure TypeScript, **zero UI dependencies**. Card model, batu flow state machine, scoring, and the five games as modules behind one shared interface. The no-UI-deps rule is what makes the engine reusable for phase 2 online play; it's enforced by the package having nothing to import from.
- **`apps/mobile`** — Expo (React Native + react-native-web). One codebase builds web, iOS, and Android.
- **State management:** Zustand.

### Non-negotiables

- **The UI never computes legality or score.** It renders exactly what `legalMoves` returns and displays what the scoring system reports. If the UI is deciding something, it's a bug.
- **Every state change flows through the engine.**
- **Ranking direction is per-game.** Trump and Rumpun rank high, Seven/Hearts/Capsa rank low. Modules declare it; the tally never hardcodes it. Getting this wrong silently inverts a leaderboard.
- **Module state must serialize losslessly**, including hidden information. Phase 1 resumes an interrupted batu mid-round.

See `specs/modules/game-modules.md` for the module interface and `specs/mechanics/` for flow and scoring.

## Scope

- **Phase 1 (current):** pass & play on a single device. 4 humans, nicknames only, no accounts. Full batu with automated scoring and local save/resume.
- **Phase 2:** online multiplayer, reusing this engine unchanged.
- **Later:** AI bots, accounts.

Don't build for phase 2 yet — but don't put UI concerns in the engine either, because phase 2 is exactly why that line exists.

## Ties and Edge Cases

The bug-prone parts, all specified — check the spec before guessing:

- Placement ties split evenly and need not total 10 after rounding (`specs/mechanics/scoring.md`).
- An all-four-tied round awards no markers; dealer rotation then picks at random.
- Seven's ace value has **three** cases: 1, 14, or 7 when no ace was placed all round.
- Capsa bombs are playable only on your own turn, but against any combination.
- Trump's exactly-13 rule adjusts every bid by the same amount, chosen by the highest bidder.
