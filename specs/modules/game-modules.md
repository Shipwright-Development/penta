# Spec — Game Modules

Each of the five games is a **module** implementing a shared interface, driven by the flow engine ([[penta-project/specs/mechanics/game-flow|Game Flow]]). Rules are defined in `penta-project/game-rule/games/` — modules implement them, specs don't restate them.

## Module Interface

This is the contract, not a sketch — all five modules implement it exactly, so the flow engine can drive any game without knowing which one it is. Agree it before writing modules; five implementations built against prose will drift apart.

### Shared types

```ts
type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';
interface Card { suit: Suit; rank: Rank; }

/** Seat index, clockwise. Fixed for the whole batu. */
type PlayerId = 0 | 1 | 2 | 3;
type GameId = 'trump' | 'seven' | 'hearts' | 'rumpun' | 'capsa';

interface DealContext {
  hands: Record<PlayerId, Card[]>;  // 13 each, already validated by the flow engine
  dealer: PlayerId;
  roundIndex: 0 | 1 | 2 | 3;        // Seven's starting suit and Hearts' pass direction key off this
}

interface RoundResult {
  scores: Record<PlayerId, number>;
  winners: PlayerId[];  // □ — may hold 1..3 entries, or 0 when all four tie
  losers: PlayerId[];   // ▼ — same
}
```

### The module

```ts
interface GameModule<S, M> {
  readonly id: GameId;

  /** Which direction places 1st. Scoring reads this; the tally never hardcodes it. */
  readonly rankingDirection: 'high' | 'low';

  setup(ctx: DealContext): S;

  /**
   * Who the engine is waiting on. Normally one player. Returns several during
   * simultaneous phases — Trump bidding, Hearts passing — which pass & play
   * then collects one at a time behind separate handoff screens.
   * Empty once the round is over.
   */
  pendingPlayers(state: S): PlayerId[];

  /** The only source of move legality. The UI renders exactly this and nothing else. */
  legalMoves(state: S, player: PlayerId): M[];

  /** Pure: returns new state, never mutates. Rejects a move not in legalMoves. */
  applyMove(state: S, player: PlayerId, move: M): S;

  isRoundOver(state: S): boolean;
  roundResult(state: S): RoundResult;

  /** Safe for the shared screen — table cards, trick in progress, revealed piles. */
  publicView(state: S): unknown;

  /** Only ever rendered behind a handoff screen, for that player alone. */
  privateView(state: S, player: PlayerId): unknown;

  serialize(state: S): unknown;   // JSON-safe
  deserialize(data: unknown): S;
}
```

### Why these shapes

- **`pendingPlayers` rather than `currentPlayer`.** Trump's bidding and Hearts' passing are simultaneous in the physical game. A single-player accessor forces every module to fake a turn order that isn't in the rules, and the handoff screen needs the real answer.
- **`publicView` / `privateView` are part of the contract, not the UI's business.** The UI cannot be trusted to work out what's secret — it would have to understand each game to do it. The module already knows. This is also exactly the split phase 2 needs when the server sends each device its own slice.
- **`applyMove` is pure.** Undo is a single-step rollback ([[penta-project/specs/phases/pass-and-play-ui|Pass & Play UI]]) and save/resume snapshots state after every move; both are trivial with immutable state and painful without.
- **`serialize` / `deserialize` must round-trip losslessly, hidden information included** — unrevealed Rumpun piles, Seven discard piles, un-revealed Trump bids. Property-test the round trip per module. See [[penta-project/specs/mechanics/persistence|Persistence]].
- **`M` is per-module.** Trump's moves are bids and card plays; Capsa's are combinations and passes. No shared move union — the flow engine never inspects a move, it only passes it through.

## Shared Infrastructure

- **Trick-taking core** (used by Trump, Hearts, Rumpun): trick state, follow-suit enforcement, trick winner resolution, "X can't be led until broken" logic with its exceptions. Each game parameterizes it (trump suit or none, what "breaking" means, Rumpun's non-following discard rule).
- **Card model**: rank, suit, per-game rank/suit ordering (Capsa's differ), per-game card values (Seven's discard values, Rumpun's trick values).

## Per-Game Implementation Notes

- **[[penta-project/game-rule/games/trump|Trump]]** — simultaneous secret bids become sequential private input in pass & play (see [[penta-project/specs/phases/pass-and-play-ui|UI spec]]); reveal together after all four are in. A two-face-card "shouted" bid is digitally just entering a number ≥ 7 alongside the two face cards — no extra constraint. Deal validity check runs before bidding. **Bid validation:** a two-card bid must be two number cards or two face cards — never one of each; different suits makes it NT. **Highest-bidder resolution is three-tiered:** bid value, then suit ranking, then highest individual card — implement all three or a same-suit tie deadlocks the round. **Exactly-13 adjustment** is a decision prompt for the highest bidder; the amount must be non-zero, and any bid it pushes below 0 scores −5 plus −2 per trick won, regardless of what that bid started at.
- **[[penta-project/game-rule/games/seven|Seven]]** — must-play enforcement; line collapse marks all remaining cards of that suit as discard-only. **The ace convention is a player choice, not a derived value:** until an ace is placed, `legalMoves` must offer an ace at *both* ends, and whichever the player picks locks the convention for every suit that round. **Ace value has three cases, not two:** 1 if aces went under 2s, 14 if above kings, and **7 if no ace was placed at all that round** — the third case is easy to miss and only shows up in rare rounds.
- **[[penta-project/game-rule/games/hearts|Hearts]]** — passing phase varies by round number (module receives round index); moon detection at round end flips the □/▼ assignment.
- **[[penta-project/game-rule/games/rumpun|Rumpun]]** — the "blind arrangement" is informationless, so the app deals directly into 3×(2 down + 1 up) + 4 hand at random. Reveal-under-card happens after trick resolution. **Trick resolution has three cases, not two:** a playable card of the led suit competes normally; trump played when unable to follow **wins** like ordinary trump; any other off-suit card is a dump that cannot win but still scores to the trick winner. **Two orderings also coexist here and must not be conflated:** card *rank* (2→A) decides trump, trick winners, and follow-suit; card *value* (10 = +5, 6 = −1, …) only ever feeds scoring.
- **[[penta-project/game-rule/games/big-two|Capsa Banting]]** — combination validator (singles, pairs, 5-card hands, no triples; straight boundaries per rules). Bombs are playable **only on your own turn**, but regardless of the current combination size or what's on the table — they act as stoppers, beaten only by higher bombs. No out-of-turn play exists anywhere in Capsa. Two things the validator gets wrong if written naively: **passing locks a player out** of the current trick until someone leads fresh (so `currentPlayer` skips them), and the **royal flush outranks every straight flush** even though a suited J-Q-K-A-2 beats 10-J-Q-K-A under the ordinary straight ordering — the bomb hierarchy overrides it.

## Open Questions

- *(none currently — bomb timing and shouted-bid input resolved 2026-07-11; ranking direction, turn accessor, and Seven's no-ace case resolved 2026-08-07)*
