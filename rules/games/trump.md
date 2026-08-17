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
- **Two-card bids** (minimum total of 7). Both cards must be the same kind — you may not mix:
  - Two number cards (A–10): bid = their sum.
  - Two face cards (J/Q/K): shout the desired bid (must be ≥ 7).
  - **A number card paired with a face card is not a legal bid.**
  - Two cards of **different suits** = a **No-Trump (NT)** declaration.
- Bids are revealed simultaneously. Bid cards return to hand immediately.

## Trump Determination

- The **highest bidder's suit** becomes trump. Ties are broken by suit ranking ♣ < ♦ < ♥ < ♠ (for two-card bids, use the higher suit).
- **Still tied after that** — same number *and* same suit, e.g. a single 8♠ against 3♠ + 5♠ — the **higher individual card wins** (8♠ beats 5♠).
- If the highest bidder declared NT, the round is played **without trump**. A losing NT declaration fizzles — it counts only as its number.

## The Exactly-13 Rule

If all bids total exactly 13, the highest bidder **must** adjust every player's bid up or down by the same amount of their choosing (any amount). Scoring uses the adjusted bids and adjusted total.

- The amount must be **non-zero**. Adjusting all four bids by *d* changes the total by 4*d*, so only *d* = 0 would leave the total at 13.
- A 0-bidder raised to 1+ becomes a normal bidder (loses 0-bid special scoring).
- **0-bid scoring belongs to the bid as originally made, not to the adjusted number.** A bid adjusted *to* exactly 0 scores as a normal bidder aiming at 0 tricks: take none and score 0 (not +5); take some and pay the ordinary per-trick penalty.
- **Any bid pushed below 0** — whether it started at 0 or higher — automatically scores **−5**, plus **−2 per trick won**. A player adjusted from 5 down to −2 scores the same way a pushed 0-bidder does.

## Play

- The highest bidder leads the first trick; the trick winner leads the next.
- Standard trick-taking: follow suit if able; otherwise play any card (including trump). Highest trump wins; if no trump, highest card of the led suit wins.
- **Trump breaking:** trump cannot be *led* until it has been played on a trick (broken). The opening lead also cannot be trump. Exception: a player whose playable cards are all trump may lead trump.
- **Trump is played face down.** A trump card is laid face down; the other players don't see which trump it is until the trick is revealed — once all four cards are down, the whole trick is turned face up and resolved. Non-trump cards are played face up as usual. This hides information during the trick only; it changes no legality or scoring (the led suit is always the first, face-up card, unless the lead itself is trump).

## Scoring

- **Exact bid:** score = your bid.
- **Missed bid** (total bids **over** 13): −1 per trick over your bid, −2 per trick under.
- **Missed bid** (total bids **under** 13): −1 per trick under your bid, −2 per trick over.
- **0-bid:** success (no tricks) = **+5**. Failure = **−5** for the first trick, **−2** for each additional trick.

## Markers

- **□** highest score this round · **▼** lowest score this round
