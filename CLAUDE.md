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

Copies are byte-identical to the vault on purpose, so a diff reveals drift immediately. That's also why they still contain Obsidian wikilinks:

- `[[penta-project/specs/mechanics/scoring|Scoring]]` → `specs/mechanics/scoring.md`
- `[[penta-project/game-rule/penta|penta.md]]` → `rules/penta.md`
- A bare `[[trump|Trump]]` inside a rules file → `rules/games/trump.md`
- Anything pointing at `dev-link` is a vault-only file — ignore it.

`rules/` wins over `specs/` wins over code comments, always.

## Read Before Building

`specs/main.md` is the index and holds the phase 1 definition of done. Then, by area: `specs/mechanics/game-flow.md` (batu lifecycle, dealing, dealer rotation, first player), `specs/mechanics/scoring.md` (two-tier scoring, ranking direction, ties), `specs/mechanics/persistence.md` (save format and resume), `specs/modules/game-modules.md` (the typed module interface every game implements), `specs/phases/pass-and-play-ui.md` (privacy model, platform, presentation).

## Architecture

npm workspaces monorepo:

- **`packages/engine`** — pure TypeScript, **zero UI dependencies**. Card model, batu flow state machine, scoring, and the five games as modules behind one shared interface. The no-UI-deps rule is what makes the engine reusable for phase 2 online play; it's enforced by the package having nothing to import from.
- **`apps/mobile`** — Expo (React Native + react-native-web). One codebase builds web, iOS, and Android. **Phase 1 builds and tests the web target only** — a page played on a PC or laptop. Native stays available so phase 2 needs no rewrite, but nothing about it is in scope now.
- **State management:** Zustand.
- **Tooling:** latest stable Expo SDK, TypeScript strict, Vitest for engine tests, ESLint + Prettier.
- **Cards are drawn in code** (SVG/CSS), no image assets.
- **Bilingual from the first screen** — English and Indonesian, switchable in setup. Every user-facing string goes through the i18n layer; do not hardcode English "for now". Game names (*batu*, *rumpun*, *capsa banting*) stay Indonesian in both.

### Non-negotiables

- **The UI never computes legality or score.** It renders exactly what `legalMoves` returns and displays what the scoring system reports. If the UI is deciding something, it's a bug.
- **Every state change flows through the engine.**
- **Ranking direction is per-game.** Trump and Rumpun rank high, Seven/Hearts/Capsa rank low. Modules declare it; the tally never hardcodes it. Getting this wrong silently inverts a leaderboard.
- **Module state must serialize losslessly**, including hidden information. Phase 1 resumes an interrupted batu mid-round.

See `specs/modules/game-modules.md` for the module interface and `specs/mechanics/` for flow and scoring.

## Scope

- **Phase 1 (current):** pass & play on a single device — a web page on a PC or laptop. 4 humans, nicknames only, no accounts. Full batu with automated scoring and local save/resume. `specs/main.md` holds the definition of done; treat it as the finish line.
- **Phase 2:** online multiplayer, reusing this engine unchanged.
- **Later:** AI bots, accounts.

Don't build for phase 2 yet — but don't put UI concerns in the engine either, because phase 2 is exactly why that line exists.

## Ties and Edge Cases

The bug-prone parts, all specified — check the spec before guessing:

- Placement ties split evenly and need not total 10 after rounding (`specs/mechanics/scoring.md`).
- An all-four-tied round awards no markers; dealer rotation then picks at random.
- **Rumpun trick resolution has three cases:** follow suit normally; trump played when unable to follow **wins**; any other off-suit card is a dump that can't win but still scores to the trick winner. Rumpun also has two orderings that must not be conflated — card *rank* decides trumps and tricks, card *value* only feeds scoring.
- **Trump's highest-bidder resolution is three-tiered:** bid value, then suit ranking, then highest individual card. Skip the third and a same-suit tie deadlocks the round.
- Trump's exactly-13 rule adjusts every bid by the same non-zero amount, chosen by the highest bidder. Any bid pushed below 0 scores −5 plus −2 per trick, whatever it started at.
- Seven's ace value has **three** cases: 1, 14, or 7 when no ace was placed all round. The convention is a **player choice** — offer an ace at both ends until one is placed.
- Capsa bombs are playable only on your own turn, but against any combination. **Passing locks a player out** of the current trick, and the **royal flush outranks every straight flush** despite the ordinary straight ordering.
