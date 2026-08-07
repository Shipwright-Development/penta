# Spec — Scoring

Implements the two-tier scoring defined in [[penta-project/game-rule/penta|penta.md]] (Scoring section). This spec covers *how the app tracks and presents it*, not the rules themselves.

## Data Model

- **Score sheet** per batu: for each of the 5 games × 4 rounds × 4 players → round score, plus □/▼ markers.
- Game score = running cumulative sum per game column.
- Penta score = cumulative across games, updated after each game's 4th round.

## Responsibilities

- Round scores and □/▼ recipients come **from the game module** ([[penta-project/specs/modules/game-modules|Game Modules]]); the scoring system records, accumulates, and tallies — it never re-derives game outcomes.
- Penta tally (after a game's round 4): rank by final game score **in that game's direction**, award placement points 5/3/2/0, split ties evenly, then +1 per □ and −1 per ▼. All per the rules file — implement once, property-test heavily (ties are the bug magnet).

## Ranking Direction

Each game declares whether a higher or lower cumulative score places better. This is per-game, not global — getting it wrong silently inverts an entire leaderboard, so it belongs in the module's own definition rather than in the scoring code's assumptions.

| Game | 1st place is |
|---|---|
| Trump | highest total |
| Seven | lowest total |
| Hearts | lowest total |
| Rumpun | highest total |
| Capsa Banting | lowest total (fewest cards left) |

## Ties

- **Placement ties:** sum the tied placements' points and split evenly. Keep the exact value internally; round to 2 dp only for display.
- **All four tied in a round:** no □ and no ▼ awarded that round (per the rules file). Reachable in Seven (a round where nobody discards) and Rumpun; impossible in Hearts and Capsa Banting. The flow engine then picks the next dealer at random from all four — see [[penta-project/specs/mechanics/game-flow|Game Flow]].

## UI Requirements

- **Score sheet view**, always accessible: the 4×4-per-game grid with cumulative values and markers, matching how Ferdi writes it on paper (rows = rounds, columns = players, markers beside scores).
- **Penta standings view**: current penta scores + which games are tallied so far.
- After each round: a brief result summary (round scores, who got □/▼, updated cumulative).
- After each penta tally: placement breakdown showing the math (placement pts + marker adjustments), so disputes are settleable at a glance.
- Batu end: champion screen; equal scores = shared victory.

## Invariants (test targets)

- Placement points distributed per tally sum to 10 (5+3+2+0) **on exact internal values**. Displayed 2 dp values may not — a three-way tie for 1st shows 3.33 each. Don't assert the invariant against rounded output.
- Rounding happens once, at display. Rounded values never feed back into accumulation.
- Marker counts per round: normally ≥ 1 □ and ≥ 1 ▼ (can be multiple; moon shot = 1□/3▼). The all-four-tied case is the sole exception — 0 of each.
- Ranking direction is read from the module, never hardcoded in the tally.
