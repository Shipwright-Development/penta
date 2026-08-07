# Spec — Pass & Play UI (Phase 1)

One shared device, 4 human players. The core UI problem: **hidden information on a shared screen**.

## Platform & Presentation

Decided 2026-08-07.

- **Phase 1 ships as a web page, played on a PC or laptop.** That's the target to design and test against — a desktop browser window, four people around one screen, keyboard and mouse. Phones and tablets are phase 2 concerns; the app shouldn't break on them, but nothing is optimised for them yet.
- The Expo / react-native-web stack still stands ([[penta-project/dev-link|dev-link]]): it builds the web target now and keeps iOS and Android available later without a rewrite. Phase 1 simply doesn't ship those.
- **Cards are drawn in code** — SVG and CSS, no image assets. No licensing to track, scales to any size, and restyling later is a stylesheet change rather than an asset pipeline.
- **Bilingual, switchable.** English and Indonesian, toggled in setup. All user-facing copy goes through an i18n layer from the first screen — retrofitting one after the UI exists means touching every component. Game and concept names (*batu*, *rumpun*, *capsa banting*) stay Indonesian in both languages; they're proper nouns.
- Handoff and privacy still matter on a laptop: the reveal gesture and screen lock work the same when the machine is turned toward a player rather than handed over.

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
