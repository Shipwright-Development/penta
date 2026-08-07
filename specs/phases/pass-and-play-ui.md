# Spec — Pass & Play UI (Phase 1)

One shared device, 4 human players. The core UI problem: **hidden information on a shared screen**.

## Privacy Model

- Every private view (a hand, a bid, discard pile review) sits behind a **handoff screen**: "Pass to <nickname>" → tap & hold / tap to reveal → play → screen locks before the next player.
- Nothing private is ever rendered until the reveal gesture.
- Public state (table cards, score sheet, trick in progress) is always visible between turns.

## Turn Loop

1. Handoff screen names the next player.
2. Reveal → player sees their hand + exactly the legal moves the engine reports (illegal moves not tappable).
3. Move confirmed → private view closes → public state updates (trick resolution, reveals, etc.) shown to everyone.

## Game-Specific Flows

- **Trump bidding:** sequential private input (each player secretly picks bid card(s) / NT / shouted number) → simultaneous reveal moment on the public screen. Exactly-13 prompt goes to the highest bidder privately or publicly (public is fine — the table sees the adjustment anyway).
- **Hearts passing:** three sequential private pick-3 screens per the round's direction; round 4 skips.
- **Seven discards:** discarding is private; a player may review *their own* discard pile during their turn only.
- **Rumpun:** app auto-deals piles (see [[penta-project/specs/modules/game-modules|Game Modules]]); public screen shows all 12 face-up cards; private view shows own 4-card hand.
- **Dealing ritual:** show the middle-card flip and who receives the first card — keep the tabletop feel.

## Score Access

- Score sheet and penta standings ([[penta-project/specs/mechanics/scoring|Scoring]]) reachable from any public screen, never from inside a private view.

## Nicknames & Session

- Setup screen: 4 nicknames + seat order. No accounts (phase 1).
- Local save so an interrupted batu can resume from exactly where it stopped. On reopen, land on the handoff screen for the next player — never restore directly into a private view, or the wrong person sees a hand.

## Undo

Decided 2026-08-07. Undo exists because a shared device invites misclicks — it is a misclick fix, not a take-back.

- **Available in pass & play and against bots. Never in online multiplayer** (phase 2), where a rollback would have to be agreed by four separate devices.
- **Toggleable in setup**, on by default. A table that wants strict play turns it off for the batu.
- **Scope:** rolls back the last confirmed move, one step. Not a full history rewind.
- **Information caveat:** undo cannot un-see. If the move revealed something — a Rumpun pile flip, a trick resolving, a Trump bid reveal — the other players have already seen it and the engine can't take that back. Warn on undo past a reveal rather than silently allowing it.
- Cheapest version first: a confirm step on every move, so most misclicks never become moves at all.

## Non-Goals (Phase 1)

- Animations beyond basic clarity, sound, themes.
- Multi-step or cross-round undo history.
