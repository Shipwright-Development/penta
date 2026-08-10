/**
 * A headless demo — no UI, just the engine talking to itself. Run with:
 *   npm run demo
 *
 * It plays one Trump round in detail, then a whole 20-game batu (real Trump +
 * stub modules for the other four games), printing the score sheet, penta
 * tallies, and the champion. This is the engine working end to end before any
 * screen exists.
 */
import type { PlayerId, GameId } from '../src/types/card';
import { PLAYER_IDS } from '../src/types/card';
import { dealForGame } from '../src/card/deck';
import { makeRng } from '../src/rng';
import { createEngine } from '../src/flow/engine';
import type { BatuState } from '../src/flow/state';
import { makeStubModule } from '../src/flow/stub';
import { createTrumpModule, trumpDealValid } from '../src/games/trump/trump';
import type { TrumpState, TrumpMove } from '../src/games/trump/trump';
import { bidValue, bidSuit } from '../src/games/trump/bid';

const NAMES = ['Ferdi', 'Adi', 'Budi', 'Cita'] as const;
const name = (p: PlayerId) => NAMES[p];
const row = (r: Record<PlayerId, number>) =>
  PLAYER_IDS.map((p) => `${name(p)} ${r[p]}`).join('   ');

// ---------------------------------------------------------------------------
// 1. One Trump round, in detail
// ---------------------------------------------------------------------------

function demoTrumpRound() {
  console.log('\n=== ONE TRUMP ROUND ===\n');
  const mod = createTrumpModule();
  const rng = makeRng(7);
  const { hands } = dealForGame(0, rng, trumpDealValid);
  let state: TrumpState = mod.setup({ hands, dealer: 0, roundIndex: 0 });

  let guard = 0;
  let announcedPlay = false;
  while (!mod.isRoundOver(state) && guard++ < 300) {
    const player = mod.pendingPlayers(state)[0];
    const move = mod.legalMoves(state, player)[0] as TrumpMove;
    state = mod.applyMove(state, player, move);

    if (move.type === 'bid') {
      console.log(`${name(player)} bids ${bidSuit(move.bid)} (value ${bidValue(move.bid)})`);
    }
    if (state.phase === 'playing' && !announcedPlay) {
      announcedPlay = true;
      const trump = state.trumpSuit ?? 'No-Trump';
      console.log(`\nHighest bidder: ${name(state.highestBidder!)}  ·  Trump: ${trump}`);
      console.log(`Targets: ${row(state.finalBids)}`);
      console.log('\n...playing 13 tricks (each takes the first legal card)...');
    }
  }

  console.log(`\nTricks won: ${row(state.tricksWon)}`);
  const result = mod.roundResult(state);
  console.log(`Scores:     ${row(result.scores)}`);
  console.log(`□ winners:  ${result.winners.map(name).join(', ') || '—'}`);
  console.log(`▼ losers:   ${result.losers.map(name).join(', ') || '—'}`);
}

// ---------------------------------------------------------------------------
// 2. A full batu
// ---------------------------------------------------------------------------

function demoFullBatu() {
  console.log('\n\n=== A FULL BATU (Trump real, others stubbed) ===\n');
  const engine = createEngine({
    modules: {
      trump: createTrumpModule(),
      seven: makeStubModule('seven'),
      hearts: makeStubModule('hearts'),
      rumpun: makeStubModule('rumpun'),
      capsa: makeStubModule('capsa'),
    },
    rng: makeRng(2026),
    dealValidators: { trump: trumpDealValid },
  });

  let s: BatuState = engine.create([...NAMES] as [string, string, string, string]);
  let guard = 0;
  while (!engine.isBatuOver(s) && guard++ < 5000) {
    if (s.phase === 'awaiting-deal') {
      s = engine.startNextGame(s);
    } else {
      const player = engine.pendingPlayers(s)[0];
      const move = engine.legalMoves(s, player)[0];
      s = engine.applyMove(s, player, move);
    }
  }

  const games: GameId[] = ['trump', 'seven', 'hearts', 'rumpun', 'capsa'];
  for (const g of games) {
    const tally = s.pentaTallies[g]!;
    console.log(`${g.toUpperCase().padEnd(7)} penta: ${row(tally.penta)}`);
  }

  console.log('\n--- PENTA STANDINGS ---');
  console.log(row(engine.standings(s)));
  const champs = engine.champion(s).map(name);
  console.log(`\n🏆 ${champs.length > 1 ? 'Shared victory' : 'Champion'}: ${champs.join(', ')}`);
}

demoTrumpRound();
demoFullBatu();
console.log('');
