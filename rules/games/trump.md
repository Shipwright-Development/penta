# Trump

A bid-exact trick-taking game. **Goal: win exactly as many tricks as you bid.** Higher score is better.

## Setup

- Deal 13 cards to each player.
- **Deal validity:** every player must hold at least one card of each suit. If not, reshuffle and redeal.

## Bidding

- All players bid **simultaneously and secretly** by placing card(s) from their hand face down:
  - **2–10:** face value
  - **A:** 1
  - **J / Q / K:** 0 (bidding to win no tricks)
- **Two-card bids** (minimum total of 7):
  - Two number cards: bid = their sum.
  - Two face cards (J/Q/K): shout the desired bid (must be ≥ 7).
  - Two cards of **different suits** = a **No-Trump (NT)** declaration.
- Bids are revealed simultaneously. Bid cards return to hand immediately.

## Trump Determination

- The **highest bidder's suit** becomes trump. Ties are broken by suit ranking ♣ < ♦ < ♥ < ♠ (for two-card bids, use the higher suit).
- If the highest bidder declared NT, the round is played **without trump**. A losing NT declaration fizzles — it counts only as its number.

## The Exactly-13 Rule

If all bids total exactly 13, the highest bidder **must** adjust every player's bid up or down by the same amount of their choosing (any amount). Scoring uses the adjusted bids and adjusted total.

- A 0-bidder raised to 1+ becomes a normal bidder (loses 0-bid special scoring).
- A 0-bidder lowered below 0 automatically scores **−5**, plus **−2 per trick won**.

## Play

- The highest bidder leads the first trick; the trick winner leads the next.
- Standard trick-taking: follow suit if able; otherwise play any card (including trump). Highest trump wins; if no trump, highest card of the led suit wins.
- **Trump breaking:** trump cannot be *led* until it has been played on a trick (broken). The opening lead also cannot be trump. Exception: a player whose playable cards are all trump may lead trump.

## Scoring

- **Exact bid:** score = your bid.
- **Missed bid** (total bids **over** 13): −1 per trick over your bid, −2 per trick under.
- **Missed bid** (total bids **under** 13): −1 per trick under your bid, −2 per trick over.
- **0-bid:** success (no tricks) = **+5**. Failure = **−5** for the first trick, **−2** for each additional trick.

## Markers

- **□** highest score this round · **▼** lowest score this round
