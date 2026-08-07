# Spec — Future Phases (Stubs)

Placeholders to expand when each phase begins. Kept minimal on purpose — decisions made too early go stale.

## Phase 2 — Online Multiplayer

- Room-based: one player creates a room, three join via code/link.
- Reuses the phase 1 engine unchanged; hidden information becomes trivial (each device only receives its own private state — the server is authoritative).
- To decide when phase 2 starts: transport (websockets), hosting, reconnection handling, spectators.

## Later — AI Bots

- Fill empty seats in either mode.
- Requires: bot decision interfaces per game module (bid strategy, card play, combination choice). Start with simple heuristics; the module interface's `legalMoves` already gives bots their action space.

## Later — Accounts & History

- Persistent identities, batu history, per-game stats (e.g., moon shots, successful 0-bids).
- Nickname-only remains the guest path.
