# Spec — Worked Examples

Test fixtures, not explanation. Every example here is arithmetic that has been checked by hand; an implementation that disagrees with one of these is wrong. Rules live in `penta-project/game-rule/` — this file only applies them.

Use these as the first unit tests for [[penta-project/specs/mechanics/scoring|Scoring]] and the Trump and Hearts modules. They cover the paths most likely to be implemented wrong.

## 1. Trump — exactly-13, adjusted up

Bids: Ferdi `5♠`, Adi `3♥`, Budi `4♦`, Cita `A♣` (= 1). Total **13**, so the rule fires.

Highest bidder is Ferdi, so **trump is ♠** and Ferdi chooses the adjustment. He picks **+1**.

| | Ferdi | Adi | Budi | Cita |
|---|---|---|---|---|
| Bid | 5 | 3 | 4 | 1 |
| Adjusted | 6 | 4 | 5 | 2 |
| Tricks won | 6 | 3 | 3 | 1 |
| Score | **6** | **−2** | **−4** | **−2** |

Adjusted total is 17, i.e. **over 13**, so misses cost −1 per trick over and −2 per trick under.

- Ferdi hit 6 exactly → scores his bid, 6.
- Adi is 1 under → −2. Budi is 2 under → −4. Cita is 1 under → −2.
- Tricks sum to 13. Markers: □ Ferdi (highest), ▼ Budi (lowest).

## 2. Trump — exactly-13, adjusted down past zero

Bids: Ferdi `7♦`, Adi `K♥` (= 0), Budi `3♠`, Cita `3♣`. Total **13** again. Ferdi is highest, so **trump is ♦**, and he picks **−2**.

| | Ferdi | Adi | Budi | Cita |
|---|---|---|---|---|
| Bid | 7 | 0 | 3 | 3 |
| Adjusted | 5 | **−2** | 1 | 1 |
| Tricks won | 5 | 2 | 3 | 3 |
| Score | **5** | **−9** | **−4** | **−4** |

Adjusted total is 5, i.e. **under 13**, so misses cost −1 per trick under and −2 per trick over.

- Ferdi hit 5 exactly → 5.
- **Adi's bid is below 0**, so the special rule applies regardless of the −2 being reached from 0: −5, then −2 per trick won → −5 − 4 = **−9**.
- Budi and Cita are each 2 over → −4 each.
- Markers: □ Ferdi, ▼ Adi.

### 2b. A bid adjusted to exactly 0

Ruled 2026-08-07: **0-bid scoring belongs to the bid as originally made.** Take the example above and give Budi an original bid of 2 instead of 3 (with Cita on 4, keeping the total at 13). After the −2 adjustment Budi sits on exactly 0:

| Budi's tricks | Score | Why |
|---|---|---|
| 0 | **0** | Hit the adjusted bid exactly → score = bid = 0. **Not +5** — he never bid 0, the adjustment put him there. |
| 2 | **−4** | Adjusted total is under 13, so −2 per trick over. |

The three cases the implementation must keep apart: a **genuine** 0-bid (+5 / −5 then −2 each), a bid **adjusted to** 0 (ordinary scoring against a target of 0), and a bid **adjusted below** 0 (−5 then −2 per trick, as Adi above).

## 3. Hearts — shooting the moon

Ferdi takes all 13 hearts and the Q♠.

| | Ferdi | Adi | Budi | Cita |
|---|---|---|---|---|
| Score | **0** | **26** | **26** | **26** |
| Marker | □ | ▼ | ▼ | ▼ |

The moon inverts the usual marker logic, but note it lands in the same place the ordinary rule would here: Ferdi's 0 is the lowest score and the other three tie for highest. The implementation must still branch on moon detection rather than rely on that coincidence — a moon where the shooter is the only □ and *all three* others take ▼ is the specified outcome regardless of scores.

## 4. Penta tally — tie for 1st, low-ranking game

**Seven**, which ranks **low**. Final game scores and markers accumulated over four rounds:

| | Ferdi | Adi | Budi | Cita |
|---|---|---|---|---|
| Final score | 40 | 55 | 40 | 71 |
| Markers | 1□ 1▼ | — | 2□ | 1□ 3▼ |

Ranking low: Ferdi and Budi tie for 1st on 40, Adi is 3rd, Cita 4th.

- Tied 1st takes the 1st and 2nd placement points: (5 + 3) / 2 = **4 each**.
- Adi is **3rd** → 2. Cita is 4th → 0. Placement points total 4 + 4 + 2 + 0 = 10. ✓

| | Ferdi | Adi | Budi | Cita |
|---|---|---|---|---|
| Placement | 4 | 2 | 4 | 0 |
| Markers | 0 | 0 | +2 | −2 |
| **Penta** | **4** | **2** | **6** | **−2** |

## 5. Penta tally — three-way tie, rounding

**Rumpun**, which ranks **high**. Final scores: Ferdi 12, Adi 12, Budi 12, Cita −3.

Three players tie for 1st, taking the 1st, 2nd and 3rd placement points: (5 + 3 + 2) / 3 = 3.333… → **3.33 displayed**. Cita is 4th → 0.

Displayed points total 9.99, not 10. That is correct and expected — the invariant in [[penta-project/specs/mechanics/scoring|Scoring]] holds on the exact internal value, never on the rounded display.

Markers are omitted here to isolate the rounding; a real tally adds them on top, as in example 4.

## Cross-checks these examples encode

Useful as assertions in their own right:

- Tricks won across the four players always sum to **13** (examples 1 and 2).
- An adjustment of *d* moves the bid total by **4*d*** — 13 → 17 at *d* = +1, 13 → 5 at *d* = −2.
- Over-13 and under-13 totals swap which miss costs −1 and which costs −2. Examples 1 and 2 exercise one each; an implementation that hardcodes one direction passes one and fails the other.
- Placement points sum to exactly **10** internally in every tally, ties included (examples 4 and 5).
- Markers awarded across a game's four rounds are at least 4 □ and 4 ▼ unless a round was all-four-tied. Example 4's markers total 4 □ and 4 ▼ — deliberately, so the fixture is internally consistent.

## 6. Golden batu — to be recorded

> [!warning] Missing
> The [[penta-project/specs/main|definition of done]] says a batu played through the app must produce the same numbers as one scored by hand. **No such batu is recorded anywhere**, so that test cannot currently be run.
>
> Fix: next time the group plays a full batu on paper, photograph the sheet and transcribe it here — all four round scores per game per player, plus markers, plus the final penta scores. That single artifact turns the acceptance test from a description into something executable, and would catch every scoring bug in one run.
>
> Transcribe as: for each of the 5 games, a 4×4 grid of round scores with markers, and the penta scores that were tallied from it.
