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

- **Score sheet view**, always accessible: the 4×4-per-game grid with cumulative values and markers, matching how Ferdi writes it on paper (rows = rounds, columns = players, markers beside scores). Layout below.
- **Penta standings view**: current penta scores + which games are tallied so far.
- After each round: a brief result summary (round scores, who got □/▼, updated cumulative).
- After each penta tally: placement breakdown showing the math (placement pts + marker adjustments), so disputes are settleable at a glance.
- Batu end: champion screen; equal scores = shared victory.

## Score Sheet Layout

> [!warning] Needs confirming
> Reconstructed from description — nobody building this has seen the paper sheet. **Add a photo of a real one to the vault and correct this**, then delete this callout. Two things in particular are guesses: whether each cell shows the round score or the running total, and whether penta scores sit under each game block or in one table at the end.

One block per game, in play order. Rows are rounds, columns are players, markers sit beside the number:

```
                    Ferdi       Adi        Budi       Cita
  TRUMP    R1          5 □       -2 ▼         3         -1
           R2         13 □       -6 ▼         6          3
           R3         11 ▼        1 □         9         10 □
           R4         16 □        4          7          -2 ▼
           ──────────────────────────────────────────────────
           total      16          4          7          -2
           place     1st (5)    3rd (2)    2nd (3)    4th (0)
           markers    3□ 1▼      1□ 2▼       —         1□ 1▼
           penta     5+2 = 7    2-1 = 1    3+0 = 3    0+0 = 0

  SEVEN    R1  ...
```

Worked from these round scores — R1 `5 / -2 / 3 / -1`, R2 `8 / -4 / 3 / 4`, R3 `-2 / 7 / 3 / 7`, R4 `5 / 3 / -2 / -12`. R3 shows a tied □ going to two players. Trump ranks high, so Budi's 7 places 2nd ahead of Adi's 4.

- Cells show the **running total** after that round, so the last row is the final game score — that's the number the penta tally ranks.
- The `place`, `markers`, and `penta` rows appear only once that game's round 4 is done, keeping placement points and marker adjustment separate so the arithmetic is checkable at a glance.
- Ranking direction differs per game, so the "best" column isn't always the largest number — highlight the leader rather than expecting the reader to remember which way this game runs.
- **Markers are awarded on the round score, but the cells show running totals**, so the sheet alone doesn't let you check why a □ landed where it did. Either show the round score on hover/tap or accept that marker auditing lives in the after-round summary. Worth deciding when the real sheet is confirmed.

## Invariants (test targets)

- Placement points distributed per tally sum to 10 (5+3+2+0) **on exact internal values**. Displayed 2 dp values may not — a three-way tie for 1st shows 3.33 each. Don't assert the invariant against rounded output.
- Rounding happens once, at display. Rounded values never feed back into accumulation.
- Marker counts per round: normally ≥ 1 □ and ≥ 1 ▼ (can be multiple; moon shot = 1□/3▼). The all-four-tied case is the sole exception — 0 of each.
- Ranking direction is read from the module, never hardcoded in the tally.
