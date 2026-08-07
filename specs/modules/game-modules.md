# Spec — Game Modules

Each of the five games is a **module** implementing a shared interface, driven by the flow engine ([[penta-project/specs/mechanics/game-flow|Game Flow]]). Rules are defined in `penta-project/game-rule/games/` — modules implement them, specs don't restate them.

## Module Interface (conceptual)

Every module must provide:

- `rankingDirection` — whether a higher or lower cumulative score places 1st ([[penta-project/specs/mechanics/scoring|Scoring]] reads this; it is never hardcoded in the tally)
- `setup(hands, dealerContext)` — game-specific initialization (bids, passing, blind piles, …), and it returns who opens
- `currentPlayer(state)` — whose turn it is. The pass & play handoff screen needs to *ask* this, not be told; the flow engine uses it to drive the turn loop
- `legalMoves(player, state)` — the only source of move legality; UI renders exactly this
- `applyMove(move)` — advances state
- `isRoundOver(state)`
- `roundResult(state)` → per-player round score + □/▼ recipients (per the Markers section of each rule file). Either marker list may be empty when all four players tie.
- `serialize(state)` / `deserialize(data)` — phase 1 resumes an interrupted batu mid-round, so every module's state must round-trip losslessly, including hidden information (unrevealed Rumpun piles, Seven discard piles, unrevealed Trump bids). Enforce with a round-trip property test per module.

## Shared Infrastructure

- **Trick-taking core** (used by Trump, Hearts, Rumpun): trick state, follow-suit enforcement, trick winner resolution, "X can't be led until broken" logic with its exceptions. Each game parameterizes it (trump suit or none, what "breaking" means, Rumpun's non-following discard rule).
- **Card model**: rank, suit, per-game rank/suit ordering (Capsa's differ), per-game card values (Seven's discard values, Rumpun's trick values).

## Per-Game Implementation Notes

- **[[penta-project/game-rule/games/trump|Trump]]** — simultaneous secret bids become sequential private input in pass & play (see [[penta-project/specs/phases/pass-and-play-ui|UI spec]]); reveal together after all four are in. A two-face-card "shouted" bid is digitally just entering a number ≥ 7 alongside the two face cards — no extra constraint. Deal validity check runs before bidding. **Bid validation:** a two-card bid must be two number cards or two face cards — never one of each; different suits makes it NT. **Exactly-13 adjustment** is a decision prompt for the highest bidder; the amount must be non-zero, and any bid it pushes below 0 scores −5 plus −2 per trick won, regardless of what that bid started at.
- **[[penta-project/game-rule/games/seven|Seven]]** — must-play enforcement; ace convention is set by the first ace placement and locked for the round; line collapse marks all remaining cards of that suit as discard-only. **Ace value has three cases, not two:** 1 if aces went under 2s, 14 if above kings, and **7 if no ace was placed at all that round** — the third case is easy to miss and only shows up in rare rounds.
- **[[penta-project/game-rule/games/hearts|Hearts]]** — passing phase varies by round number (module receives round index); moon detection at round end flips the □/▼ assignment.
- **[[penta-project/game-rule/games/rumpun|Rumpun]]** — the "blind arrangement" is informationless, so the app deals directly into 3×(2 down + 1 up) + 4 hand at random. Reveal-under-card happens after trick resolution. Off-suit dumps can't win but score to the trick winner. **Two orderings coexist here and must not be conflated:** card *rank* (2→A) decides trump, trick winners, and follow-suit; card *value* (10 = +5, 6 = −1, …) only ever feeds scoring.
- **[[penta-project/game-rule/games/big-two|Capsa Banting]]** — combination validator (singles, pairs, 5-card hands, no triples; straight boundaries per rules). Bombs are playable **only on your own turn**, but regardless of the current combination size or what's on the table — they act as stoppers, beaten only by higher bombs. No out-of-turn play exists anywhere in Capsa. Two things the validator gets wrong if written naively: **passing locks a player out** of the current trick until someone leads fresh (so `currentPlayer` skips them), and the **royal flush outranks every straight flush** even though a suited J-Q-K-A-2 beats 10-J-Q-K-A under the ordinary straight ordering — the bomb hierarchy overrides it.

## Open Questions

- *(none currently — bomb timing and shouted-bid input resolved 2026-07-11; ranking direction, turn accessor, and Seven's no-ace case resolved 2026-08-07)*
