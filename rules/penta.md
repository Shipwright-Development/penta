# Penta

Penta is a compound card game for **4 players** using a standard 52-card deck. One full game of penta is called a **batu**.

A batu consists of **4 rounds**, and each round consists of **5 games** played in this fixed order:

1. [[trump|Trump]]
2. [[seven|Seven]]
3. [[hearts|Hearts]]
4. [[rumpun|Rumpun]]
5. [[big-two|Capsa Banting (Big Two)]]

## Suit Ranking

Unless stated otherwise, suit ranking is (low → high): **♣ < ♦ < ♥ < ♠**

Exception: [[big-two|Capsa Banting]] uses **♦ < ♣ < ♥ < ♠**.

## Dealing

- The **very first dealer** of a batu is chosen randomly.
- After that, the dealer of each game is the **▼ recipient (loser) of the previous game**. If multiple players received ▼, pick one of them randomly.
  - If nobody received ▼ (all four tied — see Scoring), pick any of the four players randomly.
- **First-card rule:** after shuffling, the dealer flips the middle card of the deck. Its value (A = 1, J = 11, Q = 12, K = 13) determines who receives the first card: count clockwise starting from the dealer as 1, wrapping around. The flipped card is returned to the deck, then dealing proceeds clockwise from that first recipient.
  - With 4 players: A/5/9/K → dealer, 2/6/10 → left of dealer, 3/7/J → across, 4/8/Q → right of dealer.

## Scoring

Penta uses two tiers of scoring: **game scores** and **penta scores**.

### Game Scores

- Each of the 5 games keeps its own cumulative score across the 4 rounds (round scores are added up).
- Each round of each game, the winner(s) receive a **□** marker and the loser(s) receive a **▼** marker beside their score. Multiple players can receive the same marker in one round (e.g., ties, or a moon shot in Hearts).

Win/loss criteria per round:

| Game | Better score is | □ (win) | ▼ (loss) |
|---|---|---|---|
| Trump | **Higher** | Highest round score | Lowest round score |
| Seven | **Lower** | Lowest round score | Highest round score |
| Hearts | **Lower** | Lowest round score (moon shooter if shot) | Highest round score (everyone else if moon shot) |
| Rumpun | **Higher** | Highest round score | Lowest round score |
| Capsa Banting | **Lower** (cards left) | Player who goes out | Most cards left |

**All four tied:** if every player has the same round score, nobody is best or worst — **no □ and no ▼ are awarded** that round. (Possible in Seven, e.g. a round with no discards at all, and in Rumpun. Impossible in Hearts and Capsa Banting.) See Dealing for what this means for the next dealer.

### Penta Scores

After a game's 4th (final) round, its final game scores are tallied into penta points:

- **Placement:** rank players by their cumulative score for that game, using the **direction in the table above** — 1st place is the *highest* total in Trump and Rumpun, the *lowest* total in Seven, Hearts, and Capsa Banting.
- **Placement points:** 1st = 5, 2nd = 3, 3rd = 2, 4th = 0
  - Ties: sum the tied placements' points and split evenly, rounded to 2 decimal places (e.g., two players tied for 2nd: (3 + 2) / 2 = 2.5 each; the next player is 4th).
  - Rounding is for display; the split doesn't have to add back up to 10 exactly (a three-way tie for 1st gives 3.33 each).
- **Markers:** each □ = +1, each ▼ = −1.

Penta scores accumulate across all 5 games. The player with the **highest penta score** after Capsa Banting wins the batu. Equal final scores = shared victory.
