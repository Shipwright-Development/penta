import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  bidValue,
  bidSuit,
  isNumberCard,
  isFaceCard,
  type PlayerId,
  type Suit,
  type Rank,
  type Card as CardType,
  type BatuState,
  type TrumpMove,
  type HeartsMove,
  type CapsaMove,
  type SevenMove,
  type Bid,
} from '@penta/engine';
import { useT } from '../i18n';
import { theme } from '../theme';
import { suitGlyph, cardText, sortHand } from '../format';
import { engine, activePublicView, activePrivateView } from '../engine';
import { useBatu } from '../batuStore';
import { Board } from './ui';
import { Button } from './Button';
import { Card } from './Card';
import { SortToggle } from './SortToggle';

// ---- view-shape types (module publicView / privateView outputs) -----------

interface TrickPub {
  leader: PlayerId;
  plays: { player: PlayerId; card: CardType }[];
}
interface TrumpPub {
  phase: 'bidding' | 'adjustment' | 'playing' | 'done';
  trumpSuit: Suit | null;
  highestBidder: PlayerId | null;
  finalBids: Record<PlayerId, number> | null;
  currentTrick: TrickPub | null;
  trumpBroken: boolean;
  tricksWon: Record<PlayerId, number>;
  needsAdjustment?: boolean;
}
interface HeartsPub {
  phase: string;
  heartsBroken: boolean;
  trickNumber: number;
  currentTrick: TrickPub | null;
  taken: { hearts: number; queen: boolean }[];
}
interface RumpunPub {
  trumpSuit: Suit;
  currentTrick: TrickPub | null;
  piles: { up: CardType | null; down: number }[][];
}
interface CapsaPub {
  counts: number[];
  currentCombo: { cards: CardType[] } | null;
  passed: PlayerId[];
}
interface SevenLine {
  opened: boolean;
  lowNonAce: Rank | null;
  highNonAce: Rank | null;
  aceLow: boolean;
  aceHigh: boolean;
}
interface SevenPub {
  startingSuit: Suit;
  convention: 'none' | 'under' | 'above';
  lines: Record<Suit, SevenLine>;
  discardCounts: number[];
}

const sameCard = (a: CardType, b: CardType) => a.suit === b.suit && a.rank === b.rank;
const sameSet = (a: CardType[], b: CardType[]) =>
  a.length === b.length && a.every((c) => b.some((d) => sameCard(c, d)));

function useCtx() {
  const batu = useBatu((s) => s.batu) as BatuState;
  const names = useBatu((s) => s.names);
  const apply = useBatu((s) => s.apply);
  return { batu, names, apply };
}

// ---------------------------------------------------------------------------
// Public: bids revealed together
// ---------------------------------------------------------------------------

export function BidReveal() {
  const t = useT();
  const { batu, names } = useCtx();
  const seeBids = useBatu((s) => s.acceptBids);
  const pub = activePublicView(batu) as TrumpPub;
  const priv0 = activePrivateView(batu, 0);
  void priv0;
  const trumpText = pub.trumpSuit ? suitGlyph(pub.trumpSuit) : t('reveal.nt');

  return (
    <View style={styles.publicRoot}>
      <Text style={styles.h1}>{t('reveal.title')}</Text>
      <Text style={styles.big}>{t('reveal.highest', { name: names[pub.highestBidder ?? 0] })}</Text>
      <Text style={styles.muted}>{t('reveal.trump', { suit: trumpText })}</Text>
      {pub.needsAdjustment && <Text style={styles.warn}>{t('reveal.needAdjust')}</Text>}
      <View style={styles.gap} />
      <Button label={t('reveal.continue')} onPress={seeBids} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared trick board (Trump / Hearts / Rumpun play)
// ---------------------------------------------------------------------------

function TrickBoard(props: {
  player: PlayerId;
  info: string;
  turn: string;
  currentTrick: TrickPub | null;
  handCards: CardType[];
  legalCards: CardType[];
  extras?: React.ReactNode;
}) {
  const t = useT();
  const { names, apply } = useCtx();
  const undo = useBatu((s) => s.undo);
  const sortMode = useBatu((s) => s.sortMode);
  const settingsUndo = (useBatu((s) => s.batu) as BatuState).settings.undoEnabled;
  const [confirmUndo, setConfirmUndo] = useState(false);
  const isLegal = (c: CardType) => props.legalCards.some((x) => sameCard(x, c));
  const sorted = sortHand(props.handCards, sortMode);

  return (
    <Board>
      <View style={styles.infoRow}>
        <Text style={styles.trump}>{props.info}</Text>
        <Text style={styles.turn}>{props.turn}</Text>
      </View>
      <View style={styles.trickArea}>
        {props.currentTrick && props.currentTrick.plays.length > 0 ? (
          props.currentTrick.plays.map((p, i) => (
            <View key={i} style={styles.slot}>
              <Text style={styles.slotName}>{names[p.player]}</Text>
              <Card card={p.card} />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>
            {t('trick.leads', { name: names[props.currentTrick?.leader ?? props.player] })}
          </Text>
        )}
      </View>
      {props.extras}
      <View style={styles.handTop}>
        <Text style={styles.handHint}>{t('trick.hint')}</Text>
        <SortToggle />
      </View>
      <ScrollView horizontal contentContainerStyle={styles.hand}>
        {sorted.map((card, i) => {
          const legal = isLegal(card);
          return (
            <Card
              key={i}
              card={card}
              disabled={!legal}
              testID={legal ? 'legal-card' : undefined}
              onPress={legal ? () => apply({ type: 'play', card }) : undefined}
            />
          );
        })}
      </ScrollView>
      {settingsUndo && (
        <View style={styles.undoRow}>
          <Button
            label={confirmUndo ? t('trick.undoConfirm') : t('trick.undo')}
            variant={confirmUndo ? 'danger' : 'ghost'}
            small
            onPress={() => {
              if (confirmUndo) {
                undo();
                setConfirmUndo(false);
              } else setConfirmUndo(true);
            }}
          />
        </View>
      )}
    </Board>
  );
}

// ---------------------------------------------------------------------------
// Trump
// ---------------------------------------------------------------------------

function bidMatches(a: Bid, b: Bid): boolean {
  if (a.kind === 'single' && b.kind === 'single') return sameCard(a.card, b.card);
  if (a.kind === 'numbers' && b.kind === 'numbers') return sameSet(a.cards, b.cards);
  if (a.kind === 'faces' && b.kind === 'faces')
    return sameSet(a.cards, b.cards) && a.shout === b.shout;
  return false;
}

const SHOUTS = [7, 8, 9, 10, 11, 12, 13];

/** Card-based bid entry: tap 1–2 cards, pick a shout for a face pair, submit. */
function BidEntry({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names, apply } = useCtx();
  const priv = activePrivateView(batu, player) as { hand: CardType[] };
  const moves = engine.legalMoves(batu, player) as TrumpMove[];
  const selection = useBatu((s) => s.selection);
  const toggle = useBatu((s) => s.toggleSelect);
  const sortMode = useBatu((s) => s.sortMode);
  const [shout, setShout] = useState(7);

  const hand = sortHand(priv.hand, sortMode);
  const selected = (c: CardType) => selection.some((x) => sameCard(x, c));
  const bothNumber = selection.length === 2 && selection.every(isNumberCard);
  const bothFace = selection.length === 2 && selection.every(isFaceCard);

  let candidate: Bid | null = null;
  if (selection.length === 1) candidate = { kind: 'single', card: selection[0] };
  else if (bothNumber) candidate = { kind: 'numbers', cards: [selection[0], selection[1]] };
  else if (bothFace) candidate = { kind: 'faces', cards: [selection[0], selection[1]], shout };

  const matched =
    candidate &&
    moves.find(
      (m): m is Extract<TrumpMove, { type: 'bid' }> =>
        m.type === 'bid' && candidate !== null && bidMatches(m.bid, candidate),
    );
  const mixed = selection.length === 2 && !bothNumber && !bothFace;

  const onTap = (card: CardType) => {
    if (selected(card) || selection.length < 2) toggle(card);
  };

  let summary = ' ';
  if (candidate && matched) {
    const bs = bidSuit(candidate);
    summary = t('bid.willBe', {
      n: bidValue(candidate),
      trump: bs === 'NT' ? t('bid.nt') : suitGlyph(bs),
    });
  } else if (mixed) {
    summary = t('bid.mixed');
  }

  return (
    <Board>
      <View style={styles.infoRow}>
        <Text style={styles.trump}>{t('bid.title')}</Text>
        <SortToggle />
      </View>
      <Text style={styles.muted}>
        {names[player]} · {t('bid.hint')}
      </Text>
      <ScrollView horizontal contentContainerStyle={styles.hand}>
        {hand.map((card, i) => (
          <Card
            key={i}
            card={card}
            selected={selected(card)}
            testID="hand-card"
            onPress={() => onTap(card)}
          />
        ))}
      </ScrollView>
      {bothFace && (
        <View style={styles.shoutRow}>
          <Text style={styles.muted}>{t('bid.shoutLabel')}</Text>
          {SHOUTS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setShout(n)}
              style={[styles.shoutPill, shout === n && styles.shoutActive]}
            >
              <Text style={[styles.shoutText, shout === n && styles.shoutActiveText]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.bidSummary}>{summary}</Text>
      <View style={styles.undoRow}>
        <Button
          label={t('bid.submit')}
          disabled={!matched}
          testID="bid-submit"
          onPress={() => matched && apply(matched)}
        />
      </View>
    </Board>
  );
}

function TrumpView({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names, apply } = useCtx();
  const pub = activePublicView(batu) as TrumpPub;
  const moves = engine.legalMoves(batu, player) as TrumpMove[];

  if (pub.phase === 'bidding') return <BidEntry player={player} />;

  if (pub.phase === 'adjustment') {
    const amounts = moves.flatMap((m) => (m.type === 'adjust' ? [m.amount] : []));
    return (
      <Board>
        <Text style={styles.h1}>{t('adjust.title', { name: names[player] })}</Text>
        <Text style={styles.muted}>{t('adjust.hint')}</Text>
        <View style={styles.amounts}>
          {amounts.map((amount) => (
            <Pressable
              key={amount}
              testID="adjust-amount"
              style={styles.amount}
              onPress={() => apply({ type: 'adjust', amount })}
            >
              <Text style={styles.amountText}>{amount > 0 ? `+${amount}` : amount}</Text>
            </Pressable>
          ))}
        </View>
      </Board>
    );
  }

  const priv = activePrivateView(batu, player) as { hand: CardType[] };
  const legalCards = moves.flatMap((m) => (m.type === 'play' ? [m.card] : []));
  const info = pub.trumpSuit
    ? t('trick.trumpIs', { suit: suitGlyph(pub.trumpSuit) })
    : t('trick.nt');
  return (
    <TrickBoard
      player={player}
      info={info}
      turn={t('turn.turn', { name: names[player] })}
      currentTrick={pub.currentTrick}
      handCards={priv.hand}
      legalCards={legalCards}
      extras={
        <Text style={styles.scoreStrip}>
          {t('trick.tricks')}:{' '}
          {[0, 1, 2, 3]
            .map(
              (p) =>
                `${names[p as PlayerId]} ${pub.tricksWon[p as PlayerId]}/${pub.finalBids?.[p as PlayerId] ?? 0}`,
            )
            .join('  ')}
        </Text>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Hearts
// ---------------------------------------------------------------------------

function HeartsView({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names, apply } = useCtx();
  const pub = activePublicView(batu) as HeartsPub;
  const selection = useBatu((s) => s.selection);
  const toggle = useBatu((s) => s.toggleSelect);
  const sortMode = useBatu((s) => s.sortMode);
  const priv = activePrivateView(batu, player) as { hand: CardType[] };

  if (pub.phase === 'passing') {
    const dir =
      batu.roundIndex === 0
        ? t('hearts.left')
        : batu.roundIndex === 1
          ? t('hearts.right')
          : t('hearts.across');
    const selected = (c: CardType) => selection.some((x) => sameCard(x, c));
    return (
      <Board>
        <View style={styles.infoRow}>
          <Text style={styles.h1}>{t('hearts.pass', { dir })}</Text>
          <SortToggle />
        </View>
        <Text style={styles.muted}>{t('hearts.selectHint')}</Text>
        <ScrollView horizontal contentContainerStyle={styles.hand}>
          {sortHand(priv.hand, sortMode).map((card, i) => (
            <Card
              key={i}
              card={card}
              selected={selected(card)}
              testID="hand-card"
              onPress={() => toggle(card)}
            />
          ))}
        </ScrollView>
        <View style={styles.undoRow}>
          <Button
            label={t('hearts.confirm')}
            disabled={selection.length !== 3}
            onPress={() => apply({ type: 'pass', cards: selection } as HeartsMove)}
          />
        </View>
      </Board>
    );
  }

  const moves = engine.legalMoves(batu, player) as HeartsMove[];
  const legalCards = moves.flatMap((m) => (m.type === 'play' ? [m.card] : []));
  const broken = pub.heartsBroken ? ` · ${t('hearts.broken')}` : '';
  return (
    <TrickBoard
      player={player}
      info={`${t('trick.nt')}${broken}`}
      turn={t('turn.turn', { name: names[player] })}
      currentTrick={pub.currentTrick}
      handCards={priv.hand}
      legalCards={legalCards}
    />
  );
}

// ---------------------------------------------------------------------------
// Rumpun
// ---------------------------------------------------------------------------

function RumpunView({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names } = useCtx();
  const pub = activePublicView(batu) as RumpunPub;
  const priv = activePrivateView(batu, player) as { hand: CardType[] };
  const moves = engine.legalMoves(batu, player) as { type: 'play'; card: CardType }[];
  const legalCards = moves.map((m) => m.card);
  const pileTops = pub.piles[player].flatMap((pile) => (pile.up ? [pile.up] : []));
  const handCards = [...priv.hand, ...pileTops];

  return (
    <TrickBoard
      player={player}
      info={t('rumpun.trumpIs', { suit: suitGlyph(pub.trumpSuit) })}
      turn={t('turn.turn', { name: names[player] })}
      currentTrick={pub.currentTrick}
      handCards={handCards}
      legalCards={legalCards}
      extras={
        <View style={styles.pilesRow}>
          {[0, 1, 2, 3].map((p) => (
            <Text key={p} style={styles.pileText}>
              {names[p as PlayerId]}:{' '}
              {pub.piles[p as PlayerId]
                .map((pile) => (pile.up ? cardText(pile.up) : '▨'))
                .join(' ')}
            </Text>
          ))}
        </View>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Capsa Banting
// ---------------------------------------------------------------------------

function CapsaView({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names, apply } = useCtx();
  const pub = activePublicView(batu) as CapsaPub;
  const priv = activePrivateView(batu, player) as { hand: CardType[] };
  const selection = useBatu((s) => s.selection);
  const toggle = useBatu((s) => s.toggleSelect);
  const clearSel = useBatu((s) => s.clearSelection);
  const sortMode = useBatu((s) => s.sortMode);

  const moves = engine.legalMoves(batu, player) as CapsaMove[];
  const canPass = moves.some((m) => m.type === 'pass');
  const playSets = moves.flatMap((m) => (m.type === 'play' ? [m.cards] : []));
  const selectionLegal = playSets.some((set) => sameSet(set, selection));
  const selected = (c: CardType) => selection.some((x) => sameCard(x, c));

  return (
    <Board>
      <View style={styles.infoRow}>
        <Text style={styles.trump}>
          {pub.currentCombo
            ? `${t('capsa.currentCombo')}: ${pub.currentCombo.cards.map(cardText).join(' ')}`
            : t('capsa.freeLead')}
        </Text>
        <Text style={styles.turn}>{t('turn.turn', { name: names[player] })}</Text>
      </View>
      <Text style={styles.scoreStrip}>
        {[0, 1, 2, 3]
          .map((p) => `${names[p as PlayerId]} ${t('capsa.left', { n: pub.counts[p] })}`)
          .join('  ')}
      </Text>
      <View style={styles.handTop}>
        <Text style={styles.handHint}>{t('capsa.selectHint')}</Text>
        <SortToggle />
      </View>
      <ScrollView horizontal contentContainerStyle={styles.hand}>
        {sortHand(priv.hand, sortMode).map((card, i) => (
          <Card
            key={i}
            card={card}
            selected={selected(card)}
            testID="hand-card"
            onPress={() => toggle(card)}
          />
        ))}
      </ScrollView>
      <View style={styles.capsaButtons}>
        <Button
          label={t('capsa.play')}
          disabled={!selectionLegal}
          onPress={() => apply({ type: 'play', cards: selection } as CapsaMove)}
        />
        {selection.length > 0 && <Button label="×" variant="ghost" small onPress={clearSel} />}
        {canPass && (
          <Button
            label={t('capsa.pass')}
            variant="ghost"
            onPress={() => apply({ type: 'pass' } as CapsaMove)}
          />
        )}
      </View>
    </Board>
  );
}

// ---------------------------------------------------------------------------
// Seven
// ---------------------------------------------------------------------------

function lineText(line: SevenLine): string {
  if (!line.opened) return '—';
  const low = line.aceLow ? 'A' : String(line.lowNonAce);
  const high = line.aceHigh ? 'A' : String(line.highNonAce);
  return `${low}–${high}`;
}

function SevenView({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names, apply } = useCtx();
  const pub = activePublicView(batu) as SevenPub;
  const priv = activePrivateView(batu, player) as { hand: CardType[] };
  const moves = engine.legalMoves(batu, player) as SevenMove[];
  const sortMode = useBatu((s) => s.sortMode);
  const [aceCard, setAceCard] = useState<CardType | null>(null);

  const plays = moves.filter((m) => m.type === 'play');
  const discards = moves.filter((m) => m.type === 'discard');
  const mustDiscard = plays.length === 0 && discards.length > 0;

  const legalFor = (card: CardType) =>
    moves.filter((m) => m.type === (mustDiscard ? 'discard' : 'play') && sameCard(m.card, card));

  const conv =
    pub.convention === 'none'
      ? t('seven.aceNone')
      : pub.convention === 'under'
        ? t('seven.aceUnder')
        : t('seven.aceAbove');

  const onCard = (card: CardType) => {
    if (mustDiscard) {
      apply({ type: 'discard', card } as SevenMove);
      return;
    }
    const options = legalFor(card).filter(
      (m): m is Extract<SevenMove, { type: 'play' }> => m.type === 'play',
    );
    if (options.length === 0) return;
    if (options.length > 1) {
      setAceCard(card); // ace with both ends → prompt
      return;
    }
    apply(options[0]);
  };

  const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

  return (
    <Board>
      <View style={styles.infoRow}>
        <Text style={styles.trump}>{t('seven.aces', { conv })}</Text>
        <Text style={styles.turn}>{t('turn.turn', { name: names[player] })}</Text>
      </View>
      <View style={styles.boardLines}>
        {suits.map((suit) => (
          <Text key={suit} style={styles.lineText}>
            {suitGlyph(suit)} {lineText(pub.lines[suit])}
          </Text>
        ))}
      </View>
      <View style={styles.handTop}>
        <Text style={styles.handHint}>
          {mustDiscard ? t('seven.mustDiscard') : t('seven.playHint')}
        </Text>
        <SortToggle />
      </View>
      <ScrollView horizontal contentContainerStyle={styles.hand}>
        {sortHand(priv.hand, sortMode).map((card, i) => {
          const legal = mustDiscard || legalFor(card).length > 0;
          return (
            <Card
              key={i}
              card={card}
              disabled={!legal}
              testID={legal ? 'legal-card' : undefined}
              onPress={legal ? () => onCard(card) : undefined}
            />
          );
        })}
      </ScrollView>

      {aceCard && (
        <View style={styles.acePrompt}>
          <Text style={styles.muted}>{t('seven.aceWhich')}</Text>
          <View style={styles.aceButtons}>
            <Button
              label={t('seven.aceAboveBtn')}
              onPress={() => {
                apply({ type: 'play', card: aceCard, end: 'above' } as SevenMove);
                setAceCard(null);
              }}
            />
            <Button
              label={t('seven.aceBelowBtn')}
              onPress={() => {
                apply({ type: 'play', card: aceCard, end: 'below' } as SevenMove);
                setAceCard(null);
              }}
            />
          </View>
        </View>
      )}
    </Board>
  );
}

// ---------------------------------------------------------------------------

export function GameView({ player }: { player: PlayerId }) {
  const gid = (useBatu((s) => s.batu) as BatuState).active?.gameId;
  switch (gid) {
    case 'trump':
      return <TrumpView player={player} />;
    case 'hearts':
      return <HeartsView player={player} />;
    case 'rumpun':
      return <RumpunView player={player} />;
    case 'capsa':
      return <CapsaView player={player} />;
    case 'seven':
      return <SevenView player={player} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  publicRoot: {
    flex: 1,
    backgroundColor: theme.felt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  h1: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  big: { fontSize: 20, color: '#fff', fontWeight: '600' },
  muted: { fontSize: 15, color: '#d7ebe0', textAlign: 'center' },
  warn: { fontSize: 15, color: theme.accent, fontWeight: '700' },
  gap: { height: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trump: { color: theme.accent, fontSize: 16, fontWeight: '700' },
  turn: { color: '#fff', fontSize: 16, fontWeight: '700' },
  trickArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 110,
    paddingVertical: 10,
  },
  slot: { alignItems: 'center', gap: 4 },
  slotName: { color: '#e6f2ea', fontSize: 13 },
  scoreStrip: { color: '#fff', fontSize: 13, paddingVertical: 4 },
  handHint: { color: '#e6f2ea', fontSize: 14, marginTop: 4 },
  handTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  hand: { flexDirection: 'row', gap: 8, paddingVertical: 8, alignItems: 'flex-end' },
  shoutRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  shoutPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  shoutActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  shoutText: { color: '#e6f2ea', fontWeight: '700' },
  shoutActiveText: { color: theme.accentInk },
  bidSummary: { color: theme.accent, fontSize: 16, fontWeight: '700', minHeight: 22, marginTop: 6 },
  undoRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  bidList: { gap: 8, paddingVertical: 12 },
  bidOption: {
    backgroundColor: theme.panel,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bidText: { fontSize: 16, color: theme.text, fontWeight: '600' },
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    maxWidth: 520,
    marginTop: 12,
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
  pilesRow: { gap: 2, paddingVertical: 4 },
  pileText: { color: '#cfe3d8', fontSize: 12 },
  capsaButtons: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  boardLines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  lineText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  acePrompt: { marginTop: 10, gap: 8, alignItems: 'center' },
  aceButtons: { flexDirection: 'row', gap: 10 },
});
