import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  PLAYER_IDS,
  bidValue,
  bidSuit,
  type PlayerId,
  type Card as CardType,
  type TrumpState,
  type TrumpMove,
  type Bid,
} from '@penta/engine';
import { useT } from '../src/i18n';
import { theme } from '../src/theme';
import { suitGlyph, cardText } from '../src/format';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { LangToggle } from '../src/components/LangToggle';
import { useRound, trump } from '../src/store';

export default function PlayScreen() {
  const router = useRouter();
  const store = useRound();
  const { state } = store;

  useEffect(() => {
    if (!state) router.replace('/');
  }, [state, router]);
  if (!state) return null;

  const pending = trump.pendingPlayers(state);
  const current = pending[0];

  // ----- screen selection -------------------------------------------------
  if (store.lastTrick) return <TrickResult />;
  if (trump.isRoundOver(state)) return <Summary />;
  if (!store.ritualSeen) return <Ritual />;

  if (state.phase === 'bidding') {
    return store.revealed ? <BidEntry player={current} /> : <Handoff player={current} />;
  }
  if (state.phase === 'adjustment') {
    if (!store.bidsSeen) return <BidReveal />;
    return <Adjustment />;
  }
  // playing
  if (!store.bidsSeen) return <BidReveal />;
  return store.revealed ? <Trick player={current} /> : <Handoff player={current} />;
}

// ---------------------------------------------------------------------------
// Public: dealing ritual
// ---------------------------------------------------------------------------

function Ritual() {
  const t = useT();
  const { names, dealer, seeRitual } = useRound();
  return (
    <Public>
      <Text style={styles.h1}>{t('dealing.title')}</Text>
      <Text style={styles.big}>{t('dealing.dealer', { name: names[dealer] })}</Text>
      <View style={styles.gap} />
      <Button label={t('dealing.deal')} onPress={seeRitual} />
    </Public>
  );
}

// ---------------------------------------------------------------------------
// Public: handoff gate in front of every private view
// ---------------------------------------------------------------------------

function Handoff({ player }: { player: PlayerId }) {
  const t = useT();
  const { names, reveal } = useRound();
  return (
    <Public>
      <Text style={styles.h1}>{t('handoff.pass', { name: names[player] })}</Text>
      <Text style={styles.muted}>{t('handoff.lookAway')}</Text>
      <View style={styles.gap} />
      <Button label={t('handoff.reveal')} onPress={reveal} />
    </Public>
  );
}

// ---------------------------------------------------------------------------
// Private: bid entry (renders exactly the engine's legal bids)
// ---------------------------------------------------------------------------

function bidLabel(bid: Bid, t: ReturnType<typeof useT>): string {
  const cards = bid.kind === 'single' ? [bid.card] : bid.cards;
  const face = cards.map(cardText).join(' ');
  const suit = bidSuit(bid);
  const trumpText = suit === 'NT' ? t('bid.nt') : suitGlyph(suit);
  const amount =
    bid.kind === 'faces' ? t('bid.shout', { n: bid.shout }) : t('bid.value', { n: bidValue(bid) });
  return `${face} · ${amount} · ${trumpText}`;
}

function BidEntry({ player }: { player: PlayerId }) {
  const t = useT();
  const { names, apply } = useRound();
  const state = useRound((s) => s.state) as TrumpState;
  const moves = trump.legalMoves(state, player) as TrumpMove[];
  const bids = moves.flatMap((m) => (m.type === 'bid' ? [m.bid] : []));

  return (
    <Private title={t('bid.title')} subtitle={`${names[player]} · ${t('bid.hint')}`}>
      <ScrollView contentContainerStyle={styles.bidList}>
        {bids.map((bid, i) => (
          <Pressable
            key={i}
            testID="bid-option"
            style={styles.bidOption}
            onPress={() => apply(player, { type: 'bid', bid })}
          >
            <Text style={styles.bidOptionText}>{bidLabel(bid, t)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Private>
  );
}

// ---------------------------------------------------------------------------
// Public: bids revealed together
// ---------------------------------------------------------------------------

function BidReveal() {
  const t = useT();
  const { names, seeBids } = useRound();
  const state = useRound((s) => s.state) as TrumpState;
  const trumpText = state.trumpSuit ? suitGlyph(state.trumpSuit) : t('reveal.nt');

  return (
    <Public>
      <Text style={styles.h1}>{t('reveal.title')}</Text>
      <View style={styles.bidsGrid}>
        {PLAYER_IDS.map((p) => {
          const bid = state.bids[p];
          let label = '—';
          if (bid) {
            const bs = bidSuit(bid);
            label = `${bs === 'NT' ? t('bid.nt') : suitGlyph(bs)} · ${bidValue(bid)}`;
          }
          return (
            <View key={p} style={styles.bidCard}>
              <Text style={styles.bidName}>{names[p]}</Text>
              <Text style={styles.bidBig}>{label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.big}>
        {t('reveal.highest', { name: names[state.highestBidder ?? 0] })}
      </Text>
      <Text style={styles.muted}>{t('reveal.trump', { suit: trumpText })}</Text>
      {state.needsAdjustment && <Text style={styles.warn}>{t('reveal.needAdjust')}</Text>}
      <View style={styles.gap} />
      <Button label={t('reveal.continue')} onPress={seeBids} />
    </Public>
  );
}

// ---------------------------------------------------------------------------
// Public: exactly-13 adjustment (highest bidder)
// ---------------------------------------------------------------------------

function Adjustment() {
  const t = useT();
  const { names, apply } = useRound();
  const state = useRound((s) => s.state) as TrumpState;
  const highest = state.highestBidder ?? 0;
  const moves = trump.legalMoves(state, highest) as TrumpMove[];
  const amounts = moves.flatMap((m) => (m.type === 'adjust' ? [m.amount] : []));

  return (
    <Public>
      <Text style={styles.h1}>{t('adjust.title', { name: names[highest] })}</Text>
      <Text style={styles.muted}>{t('adjust.hint')}</Text>
      <View style={styles.amounts}>
        {amounts.map((amount) => (
          <Pressable
            key={amount}
            testID="adjust-amount"
            style={styles.amount}
            onPress={() => apply(highest, { type: 'adjust', amount })}
          >
            <Text style={styles.amountText}>{amount > 0 ? `+${amount}` : amount}</Text>
          </Pressable>
        ))}
      </View>
    </Public>
  );
}

// ---------------------------------------------------------------------------
// Private: a player's turn to play a card, with the public table above
// ---------------------------------------------------------------------------

function Trick({ player }: { player: PlayerId }) {
  const t = useT();
  const { names, apply, settings, undo } = useRound();
  const state = useRound((s) => s.state) as TrumpState;
  const [confirmUndo, setConfirmUndo] = useState(false);

  const trumpText = state.trumpSuit
    ? t('trick.trumpIs', { suit: suitGlyph(state.trumpSuit) })
    : t('trick.nt');

  const legalCards = (trump.legalMoves(state, player) as TrumpMove[]).flatMap((m) =>
    m.type === 'play' ? [m.card] : [],
  );
  const isLegal = (card: CardType) =>
    legalCards.some((c) => c.suit === card.suit && c.rank === card.rank);

  return (
    <View style={styles.tableRoot}>
      <TableHeader />
      <View style={styles.tableInfo}>
        <Text style={styles.tableTrump}>{trumpText}</Text>
        <Text style={styles.tableTurn}>{t('trick.turn', { name: names[player] })}</Text>
      </View>

      {/* Public trick in progress */}
      <View style={styles.trickArea}>
        {state.currentTrick && state.currentTrick.plays.length > 0 ? (
          state.currentTrick.plays.map((p, i) => (
            <View key={i} style={styles.playSlot}>
              <Text style={styles.playName}>{names[p.player]}</Text>
              <Card card={p.card} />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>
            {t('trick.leads', { name: names[state.currentTrick?.leader ?? player] })}
          </Text>
        )}
      </View>

      <ScoreStrip />

      {/* Private hand */}
      <Text style={styles.handHint}>
        {t('trick.target', { n: state.finalBids[player] })} · {t('trick.hint')}
      </Text>
      <ScrollView horizontal contentContainerStyle={styles.hand}>
        {state.hands[player].map((card, i) => {
          const legal = isLegal(card);
          return (
            <Card
              key={i}
              card={card}
              disabled={!legal}
              testID={legal ? 'legal-card' : undefined}
              onPress={legal ? () => apply(player, { type: 'play', card }) : undefined}
            />
          );
        })}
      </ScrollView>

      {settings.undoEnabled && (
        <View style={styles.undoRow}>
          <Button
            label={confirmUndo ? t('trick.undoConfirm') : t('trick.undo')}
            variant={confirmUndo ? 'danger' : 'ghost'}
            small
            onPress={() => {
              if (confirmUndo) {
                undo();
                setConfirmUndo(false);
              } else {
                setConfirmUndo(true);
              }
            }}
          />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public: a completed trick, before the next handoff
// ---------------------------------------------------------------------------

function TrickResult() {
  const t = useT();
  const { names, lastTrick, clearLastTrick } = useRound();
  if (!lastTrick) return null;
  return (
    <Public>
      <Text style={styles.h1}>{t('trickResult.title', { name: names[lastTrick.winner] })}</Text>
      <View style={styles.trickArea}>
        {lastTrick.plays.map((p, i) => (
          <View key={i} style={styles.playSlot}>
            <Text style={styles.playName}>{names[p.player]}</Text>
            <Card card={p.card} />
          </View>
        ))}
      </View>
      <View style={styles.gap} />
      <Button label={t('reveal.continue')} onPress={clearLastTrick} />
    </Public>
  );
}

// ---------------------------------------------------------------------------
// Public: round summary
// ---------------------------------------------------------------------------

function Summary() {
  const t = useT();
  const router = useRouter();
  const { names, reset } = useRound();
  const state = useRound((s) => s.state) as TrumpState;
  const result = trump.roundResult(state);

  const nameList = (ids: readonly PlayerId[]) =>
    ids.length ? ids.map((p) => names[p]).join(', ') : t('summary.none');

  return (
    <Public>
      <Text style={styles.h1}>{t('summary.title')}</Text>
      <View style={styles.summaryGrid}>
        {PLAYER_IDS.map((p) => (
          <View key={p} style={styles.summaryRow}>
            <Text style={styles.summaryName}>{names[p]}</Text>
            <Text style={styles.summaryScore}>{result.scores[p]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.muted}>
        {t('summary.winners')}: {nameList(result.winners)}
      </Text>
      <Text style={styles.muted}>
        {t('summary.losers')}: {nameList(result.losers)}
      </Text>
      <Text style={[styles.muted, styles.note]}>{t('summary.note')}</Text>
      <View style={styles.gap} />
      <Button
        label={t('summary.again')}
        onPress={() => {
          reset();
          router.replace('/setup');
        }}
      />
    </Public>
  );
}

// ---------------------------------------------------------------------------
// Shared bits: score strip, table header, layout shells
// ---------------------------------------------------------------------------

function ScoreStrip() {
  const t = useT();
  const { names } = useRound();
  const state = useRound((s) => s.state) as TrumpState;
  return (
    <View style={styles.scoreStrip}>
      <Text style={styles.scoreLabel}>{t('trick.tricks')}:</Text>
      {PLAYER_IDS.map((p) => (
        <Text key={p} style={styles.scoreItem}>
          {names[p]} {state.tricksWon[p]}/{state.finalBids[p]}
        </Text>
      ))}
    </View>
  );
}

function TableHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>Penta</Text>
      <LangToggle />
    </View>
  );
}

function Public({ children }: { children: ReactNode }) {
  return (
    <View style={styles.publicRoot}>
      <TableHeader />
      <View style={styles.publicCenter}>{children}</View>
    </View>
  );
}

function Private({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.privateRoot}>
      <TableHeader />
      <Text style={styles.h1}>{title}</Text>
      <Text style={styles.muted}>{subtitle}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  publicRoot: { flex: 1, backgroundColor: theme.felt },
  publicCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  privateRoot: { flex: 1, backgroundColor: theme.feltDark, padding: 20, gap: 8 },
  tableRoot: { flex: 1, backgroundColor: theme.felt, padding: 20, gap: 12 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },

  h1: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center' },
  big: { fontSize: 20, color: '#fff', fontWeight: '600' },
  muted: { fontSize: 15, color: '#d7ebe0', textAlign: 'center' },
  warn: { fontSize: 15, color: theme.accent, fontWeight: '700' },
  note: { fontStyle: 'italic', maxWidth: 460 },
  gap: { height: 8 },

  tableInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tableTrump: { color: theme.accent, fontSize: 18, fontWeight: '700' },
  tableTurn: { color: '#fff', fontSize: 18, fontWeight: '700' },

  trickArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    paddingVertical: 12,
  },
  playSlot: { alignItems: 'center', gap: 4 },
  playName: { color: '#e6f2ea', fontSize: 13 },

  scoreStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 6,
  },
  scoreLabel: { color: '#e6f2ea', fontWeight: '700' },
  scoreItem: { color: '#fff', fontSize: 14 },

  handHint: { color: '#e6f2ea', fontSize: 14, marginTop: 4 },
  hand: { flexDirection: 'row', gap: 8, paddingVertical: 8, alignItems: 'flex-end' },
  undoRow: { flexDirection: 'row', justifyContent: 'flex-end' },

  bidList: { gap: 8, paddingVertical: 12 },
  bidOption: {
    backgroundColor: theme.panel,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bidOptionText: { fontSize: 16, color: theme.text, fontWeight: '600' },

  bidsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  bidCard: {
    backgroundColor: theme.panel,
    borderRadius: 10,
    padding: 12,
    minWidth: 96,
    alignItems: 'center',
  },
  bidName: { color: theme.muted, fontSize: 13 },
  bidBig: { color: theme.text, fontSize: 20, fontWeight: '800' },

  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    maxWidth: 520,
  },
  amount: {
    backgroundColor: theme.panel,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 48,
    alignItems: 'center',
  },
  amountText: { fontSize: 16, fontWeight: '700', color: theme.text },

  summaryGrid: { gap: 6, width: 240 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryName: { color: '#fff', fontSize: 18 },
  summaryScore: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
