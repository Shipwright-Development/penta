# Spec — Game Flow

The batu lifecycle: everything between "start game" and "champion crowned", excluding per-game logic ([[penta-project/specs/modules/game-modules|Game Modules]]) and score math ([[penta-project/specs/mechanics/scoring|Scoring]]).

Rules reference: [[penta-project/game-rule/penta|penta.md]].

## Batu Structure

- One batu = 4 rounds × 5 games, fixed order: Trump → Seven → Hearts → Rumpun → Capsa Banting.
- State machine (high level):
  `SETUP → [ROUND 1..4: (GAME 1..5: DEAL → PLAY → ROUND_SCORE)] → per-game PENTA_TALLY after that game's round 4 → BATU_END`
  - Note: the penta tally for a game happens immediately after that game's 4th round finishes, not all at the end.

## Setup

- 4 players enter nicknames and seat order (seating = clockwise turn order, fixed for the batu).
- First dealer chosen randomly by the app.

## Dealing (every game)

1. Dealer is determined (see rotation below).
2. Virtual shuffle; flip the middle card; compute first-card recipient per the rule in [[penta-project/game-rule/penta|penta.md]]; show this moment in the UI (it's part of the ritual — don't hide it).
3. Deal clockwise from the recipient.
4. **Trump only:** validate every hand has all four suits; if not, reshuffle and redeal automatically (surface a notice).

## Dealer Rotation

- Next game's dealer = a ▼ recipient of the game just finished.
- Multiple ▼s → app picks one at random (show who was picked and why).
- **No ▼ at all** (all four players tied — see [[penta-project/specs/mechanics/scoring|Scoring]]) → pick at random from all four players.
- The engine must expose "who got ▼ last game" to make this auditable.

## First Player

Dealing decides who holds which cards; it does **not** decide who leads. Each game names its own opener, and the flow engine asks the module rather than choosing:

| Game | Opener |
|---|---|
| Trump | highest bidder |
| Seven | holder of the round's starting 7 (♣/♦/♥/♠ by round) |
| Hearts | holder of the 2♣ |
| Rumpun | holder of the highest face-up card |
| Capsa Banting | holder of the 3♦ |

The rule files are authoritative for how each is resolved, including tie-breaks. The flow engine passes the dealt hands to the module and receives back who acts first.

## Engine Responsibilities (vs Game Modules)

The flow engine owns: player/seat state, round & game sequencing, dealing, dealer rotation, invoking the active game module, collecting its round results, and forwarding them to scoring. It knows nothing about tricks, bids, combinations, or who leads — that's module territory.

## Edge Cases

- A game module reports its round result as: per-player round score + □/▼ recipients (possibly none of either — see Dealer Rotation). The flow engine treats this as opaque and passes it to [[penta-project/specs/mechanics/scoring|Scoring]].
- **Save/resume:** the full batu state is persisted locally after every confirmed move, so closing the app mid-round loses nothing. Restoring returns to the handoff screen for whoever was next, never straight into a private view. Requires module serialization — see [[penta-project/specs/modules/game-modules|Game Modules]].
- Abandon/quit mid-batu: beyond resume, out of scope for phase 1.
