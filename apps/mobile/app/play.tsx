import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { activePublicView } from '../src/engine';
import { useBatu, currentPlayer } from '../src/batuStore';
import {
  DealPrompt,
  Ritual,
  Handoff,
  TrickResult,
  RoundSummaryView,
  PentaTallyView,
  Champion,
} from '../src/components/flow';
import { ScoreSheet, Standings, Menu, History } from '../src/components/scores';
import { GameView, BidReveal, NoMorePlays } from '../src/components/games';

export default function PlayScreen() {
  const router = useRouter();
  const batu = useBatu((s) => s.batu);
  const overlay = useBatu((s) => s.overlay);
  const lastTrick = useBatu((s) => s.lastTrick);
  const summaryPending = useBatu((s) => s.summaryPending);
  const tallyPending = useBatu((s) => s.tallyPending);
  const ritualPending = useBatu((s) => s.ritualPending);
  const revealed = useBatu((s) => s.revealed);
  const trumpBidsSeen = useBatu((s) => s.trumpBidsSeen);

  useEffect(() => {
    if (!batu) router.replace('/');
  }, [batu, router]);
  if (!batu) return null;

  // Overlays (score sheet / standings / menu) sit on top of everything.
  if (overlay === 'sheet') return <ScoreSheet />;
  if (overlay === 'standings') return <Standings />;
  if (overlay === 'menu') return <Menu />;
  if (overlay === 'history') return <History />;

  // Public interstitials in priority order.
  if (lastTrick) return <TrickResult />;
  if (summaryPending) return <RoundSummaryView />;
  if (tallyPending) return <PentaTallyView />;
  if (batu.phase === 'batu-end') return <Champion />;
  if (batu.phase === 'awaiting-deal') return <DealPrompt />;

  // In a game.
  if (ritualPending) return <Ritual />;
  if (batu.active?.gameId === 'trump' && !trumpBidsSeen) {
    const pub = activePublicView(batu) as { phase: string };
    if (pub.phase === 'adjustment' || pub.phase === 'playing') return <BidReveal />;
  }
  if (batu.active?.gameId === 'seven') {
    const pub = activePublicView(batu) as { noPlaysLeft?: boolean };
    if (pub.noPlaysLeft) return <NoMorePlays />;
  }

  const player = currentPlayer(batu);
  if (player === null) return null;
  if (!revealed) return <Handoff player={player} />;
  return <GameView player={player} />;
}
