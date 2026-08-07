# Rumpun

A blind-stacked trick-taking game. **Goal: collect the highest card-value total from won tricks.** Higher score is better.

## Setup

- Deal 13 cards to each player, **face down — players may not look at them yet**.
- Without looking, each player arranges:
  - **3 piles**, each of 2 face-down cards, then 1 face-up card on top of each (9 cards on the table)
  - **4 cards in hand**
- Once setup is complete, players may look at their 4 hand cards. Table piles stay as arranged.

## Trump & First Lead

- **Trump** = the suit of the **highest face-up card** on the table among all players. Ties broken by ♣ < ♦ < ♥ < ♠.
  - "Highest" means **card rank**, not the scoring values below: 2 < 3 < … < 10 < J < Q < K < A. An Ace beats a 10 here, even though a 10 is worth more points.
- The holder of that highest face-up card **leads the first trick**.

## Play

- **Playable cards:** your face-up pile tops and your hand cards. Face-down cards are not playable.
- After a trick resolves, any pile-top card that was played reveals the card beneath it (flip face up).
- Follow suit if you can with a **playable** card. Buried face-down cards don't count.
- If you have no playable card of the led suit, you may play any card:
  - **Trump wins normally.** Playing trump when you can't follow suit takes the trick, exactly as in ordinary trick-taking (highest trump wins if several are played).
  - **Any other off-suit card is a dump.** It **cannot win the trick**, but its value still goes to the trick winner's score.
- **Trump breaking:** trump cannot be led until broken. Exception: no other playable option.
- 13 tricks total; trick winner leads next.

## Scoring

Sum the values of **all cards in tricks you won**:

| Card | Value |
|---|---|
| 2–5 | +1 |
| 6 | −1 |
| 7 | −2 |
| 8 | −3 |
| 9 | −4 |
| 10 | +5 |
| J | +1 |
| Q | +2 |
| K | +3 |
| A | +4 |

(The full deck totals +36.)

## Markers

- **□** highest score this round · **▼** lowest score this round
