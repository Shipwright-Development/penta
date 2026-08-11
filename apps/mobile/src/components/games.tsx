import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  bidValue,
  bidSuit,
  isNumberCard,
  isFaceCard,
  PLAYER_IDS,
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
import { suitGlyph, sortHand, isRed } from '../format';
import { engine, activePublicView, activePrivateView } from '../engine';
import { useBatu } from '../batuStore';
import { Board } from './ui';
import { Button } from './Button';
import { Card, CardBack } from './Card';
import { SortToggle } from './SortToggle';

// ---- view-shape types (module publicView / privateView outputs) -----------

interface TrickPub {
  leader: PlayerId;
  plays: { player: PlayerId; card: CardType; faceDown?: boolean }[];
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
// Seating: a square table — the viewer at the bottom, others clockwise
// ---------------------------------------------------------------------------

type SeatPos = 'top' | 'right' | 'bottom' | 'left';

/** The play a given seat has made in the current trick, if any. */
function playOf(trick: TrickPub | null, p: PlayerId) {
  return trick?.plays.find((pl) => pl.player === p) ?? null;
}

/** Left-aligned game info, with the player whose turn it is centred on top. */
function TopBar({ info, turn }: { info: string; turn: string }) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topSide}>{info}</Text>
      <Text style={styles.topTurn}>{turn}</Text>
      <Text style={styles.topSide} />
    </View>
  );
}

/**
 * Four seats around a square: the viewer sits at the bottom and the other
 * three fall clockwise (right, across, left). Every trick game renders through
 * this so the seating is consistent table-to-table.
 */
function SeatFrame({
  viewer,
  center,
  renderSeat,
}: {
  viewer: PlayerId;
  center: React.ReactNode;
  renderSeat: (p: PlayerId, pos: SeatPos) => React.ReactNode;
}) {
  const right = ((viewer + 1) % 4) as PlayerId;
  const across = ((viewer + 2) % 4) as PlayerId;
  const left = ((viewer + 3) % 4) as PlayerId;
  return (
    <View style={styles.seatFrame}>
      <View style={styles.seatRowEnd}>{renderSeat(across, 'top')}</View>
      <View style={styles.seatRowMid}>
        <View style={styles.seatSide}>{renderSeat(left, 'left')}</View>
        <View style={styles.seatCenterCol}>{center}</View>
        <View style={styles.seatSide}>{renderSeat(right, 'right')}</View>
      </View>
      <View style={styles.seatRowEnd}>{renderSeat(viewer, 'bottom')}</View>
    </View>
  );
}

/** A seat showing the player's name and the card they played this trick. */
function TrickSeat({
  name,
  play,
  isTurn,
}: {
  name: string;
  play: { card: CardType; faceDown?: boolean } | null;
  isTurn?: boolean;
}) {
  return (
    <View style={[styles.seat, isTurn && styles.seatActive]}>
      <Text style={styles.seatName}>{name}</Text>
      {play ? (
        play.faceDown ? (
          <CardBack size="sm" />
        ) : (
          <Card card={play.card} size="sm" />
        )
      ) : (
        <View style={styles.seatEmpty} />
      )}
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
  const selection = useBatu((s) => s.selection);
  const selectOne = useBatu((s) => s.selectOne);
  const settingsUndo = (useBatu((s) => s.batu) as BatuState).settings.undoEnabled;
  const [confirmUndo, setConfirmUndo] = useState(false);
  const isLegal = (c: CardType) => props.legalCards.some((x) => sameCard(x, c));
  const isSel = (c: CardType) => selection.some((x) => sameCard(x, c));
  const sorted = sortHand(props.handCards, sortMode);
  const picked = selection[0];

  const trick = props.currentTrick;
  return (
    <Board>
      <TopBar info={props.info} turn={props.turn} />
      <SeatFrame
        viewer={props.player}
        center={
          trick && trick.plays.length > 0 ? null : (
            <Text style={styles.muted}>
              {t('trick.leads', { name: names[trick?.leader ?? props.player] })}
            </Text>
          )
        }
        renderSeat={(p) => (
          <TrickSeat name={names[p]} play={playOf(trick, p)} isTurn={p === props.player} />
        )}
      />
      {props.extras}
      <View style={styles.spacer} />
      <View style={styles.handTop}>
        <Text style={styles.handHint}>{t('turn.pickHint')}</Text>
        <SortToggle />
      </View>
      <ScrollView horizontal style={styles.handScroll} contentContainerStyle={styles.hand}>
        {sorted.map((card, i) => {
          const legal = isLegal(card);
          return (
            <Card
              key={i}
              card={card}
              selected={isSel(card)}
              disabled={!legal}
              testID={legal ? 'legal-card' : undefined}
              onPress={legal ? () => selectOne(card) : undefined}
            />
          );
        })}
      </ScrollView>
      <View style={styles.actionRow}>
        <Button
          label={t('turn.play')}
          disabled={!picked}
          testID="play-submit"
          onPress={() => picked && apply({ type: 'play', card: picked })}
        />
        {settingsUndo && (
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
        )}
      </View>
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
      <View style={styles.bidCenter}>
        <Text style={styles.bidBig}>{summary}</Text>
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
      </View>
      <ScrollView horizontal style={styles.handScroll} contentContainerStyle={styles.hand}>
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
    const bids = pub.finalBids;
    return (
      <Board>
        <Text style={styles.h1}>{t('adjust.title', { name: names[player] })}</Text>
        <View style={styles.adjustCenter}>
          <Text style={styles.handHint}>{t('adjust.bidsLabel')}</Text>
          <View style={styles.bidsRow}>
            {PLAYER_IDS.map((p) => (
              <View key={p} style={styles.bidChip}>
                <Text style={styles.bidChipName}>{names[p]}</Text>
                <Text style={styles.bidChipVal}>{bids?.[p] ?? 0}</Text>
              </View>
            ))}
          </View>
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
  const priv = activePrivateView(batu, player) as {
    hand: CardType[];
    passTo: PlayerId | null;
    won: CardType[];
  };

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
        {priv.passTo !== null && (
          <Text style={styles.big}>{t('hearts.passTo', { name: names[priv.passTo] })}</Text>
        )}
        <Text style={styles.muted}>{t('hearts.selectHint')}</Text>
        <View style={styles.spacer} />
        <ScrollView horizontal style={styles.handScroll} contentContainerStyle={styles.hand}>
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
      extras={
        <View style={styles.wonRow}>
          <Text style={styles.handHint}>{t('hearts.wonLabel')}:</Text>
          {priv.won.length === 0 ? (
            <Text style={styles.muted}>{t('hearts.wonNone')}</Text>
          ) : (
            sortHand(priv.won, 'suit').map((c, i) => <Card key={i} card={c} size="sm" />)
          )}
        </View>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Rumpun
// ---------------------------------------------------------------------------

/** A table pile: face-up top with its face-down cards shown as slivers below. */
function PileView({
  pile,
  legal,
  selected,
  onPress,
  testID,
}: {
  pile: { up: CardType | null; down: number };
  legal?: boolean;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.pileCol}>
      {pile.up ? (
        <Card
          card={pile.up}
          size="sm"
          selected={selected}
          disabled={onPress !== undefined && !legal}
          testID={legal ? testID : undefined}
          onPress={legal ? onPress : undefined}
        />
      ) : (
        <View style={styles.pileGone} />
      )}
      <View style={styles.pileDowns}>
        {Array.from({ length: pile.down }).map((_, i) => (
          <View key={i} style={[styles.miniBack, i > 0 && styles.miniBackOverlap]} />
        ))}
      </View>
    </View>
  );
}

function RumpunView({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names, apply } = useCtx();
  const pub = activePublicView(batu) as RumpunPub;
  const priv = activePrivateView(batu, player) as { hand: CardType[] };
  const moves = engine.legalMoves(batu, player) as { type: 'play'; card: CardType }[];
  const legalCards = moves.map((m) => m.card);
  const selection = useBatu((s) => s.selection);
  const selectOne = useBatu((s) => s.selectOne);
  const sortMode = useBatu((s) => s.sortMode);
  const undo = useBatu((s) => s.undo);
  const [confirmUndo, setConfirmUndo] = useState(false);

  const isLegal = (c: CardType) => legalCards.some((x) => sameCard(x, c));
  const isSel = (c: CardType) => selection.some((x) => sameCard(x, c));
  const picked = selection[0];

  // Each seat shows that player's table piles; only the viewer's pile tops are
  // interactive. The trick in progress sits in the centre of the square.
  const renderSeat = (p: PlayerId) => {
    const isMe = p === player;
    const piles = pub.piles[p];
    return (
      <View style={styles.seat}>
        <Text style={styles.seatName}>{names[p]}</Text>
        <View style={styles.rumpunPiles}>
          {piles.length === 0 ? (
            <View style={styles.pileGone} />
          ) : (
            piles.map((pile, i) => (
              <PileView
                key={i}
                pile={pile}
                legal={isMe && pile.up ? isLegal(pile.up) : undefined}
                selected={isMe && pile.up ? isSel(pile.up) : undefined}
                testID={isMe ? 'legal-card' : undefined}
                onPress={isMe && pile.up ? () => selectOne(pile.up as CardType) : undefined}
              />
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <Board>
      <TopBar
        info={t('rumpun.trumpIs', { suit: suitGlyph(pub.trumpSuit) })}
        turn={t('turn.turn', { name: names[player] })}
      />
      <SeatFrame
        viewer={player}
        center={
          pub.currentTrick && pub.currentTrick.plays.length > 0 ? (
            <View style={styles.trickArea}>
              {pub.currentTrick.plays.map((pl, i) => (
                <View key={i} style={styles.slot}>
                  <Text style={styles.slotName}>{names[pl.player]}</Text>
                  {pl.faceDown ? <CardBack size="sm" /> : <Card card={pl.card} size="sm" />}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>
              {t('trick.leads', { name: names[pub.currentTrick?.leader ?? player] })}
            </Text>
          )
        }
        renderSeat={renderSeat}
      />

      <View style={styles.spacer} />

      <View style={styles.handTop}>
        <Text style={styles.handHint}>{t('rumpun.yourHand')}</Text>
        <SortToggle />
      </View>
      <ScrollView horizontal style={styles.handScroll} contentContainerStyle={styles.hand}>
        {sortHand(priv.hand, sortMode).map((card, i) => {
          const legal = isLegal(card);
          return (
            <Card
              key={i}
              card={card}
              selected={isSel(card)}
              disabled={!legal}
              testID={legal ? 'legal-card' : undefined}
              onPress={legal ? () => selectOne(card) : undefined}
            />
          );
        })}
      </ScrollView>
      <View style={styles.actionRow}>
        <Button
          label={t('turn.play')}
          disabled={!picked}
          testID="play-submit"
          onPress={() => picked && apply({ type: 'play', card: picked })}
        />
        {batu.settings.undoEnabled && (
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
        )}
      </View>
    </Board>
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
  const setSelection = useBatu((s) => s.setSelection);
  const groupSelection = useBatu((s) => s.groupSelection);
  const ungroupAt = useBatu((s) => s.ungroupAt);
  const capsaGroups = useBatu((s) => s.capsaGroups);
  const sortMode = useBatu((s) => s.sortMode);

  const moves = engine.legalMoves(batu, player) as CapsaMove[];
  const canPass = moves.some((m) => m.type === 'pass');
  const playSets = moves.flatMap((m) => (m.type === 'play' ? [m.cards] : []));
  const selectionLegal = playSets.some((set) => sameSet(set, selection));
  const selected = (c: CardType) => selection.some((x) => sameCard(x, c));

  // Groups the player set aside, filtered to cards still in hand (keep raw index).
  const handHas = (c: CardType) => priv.hand.some((h) => sameCard(h, c));
  const inGroup = (c: CardType) =>
    (capsaGroups[player] ?? []).some((g) => g.some((x) => sameCard(x, c)));
  const groups = (capsaGroups[player] ?? [])
    .map((g, rawIndex) => ({ rawIndex, cards: g.filter(handHas) }))
    .filter((x) => x.cards.length > 0);
  const ungrouped = priv.hand.filter((c) => !inGroup(c));
  const canGroup = selection.length > 0 && selection.every((c) => !inGroup(c));

  return (
    <Board>
      <View style={styles.infoRow}>
        <Text style={styles.trump}>
          {pub.currentCombo ? t('capsa.currentCombo') : t('capsa.freeLead')}
        </Text>
        <Text style={styles.turn}>{t('turn.turn', { name: names[player] })}</Text>
      </View>
      <Text style={styles.scoreStrip}>
        {[0, 1, 2, 3]
          .map((p) => `${names[p as PlayerId]} ${t('capsa.left', { n: pub.counts[p] })}`)
          .join('  ')}
      </Text>
      <View style={styles.trickArea}>
        {pub.currentCombo ? (
          pub.currentCombo.cards.map((c, i) => <Card key={i} card={c} />)
        ) : (
          <Text style={styles.muted}>{t('capsa.freeLead')}</Text>
        )}
      </View>
      <View style={styles.spacer} />
      {groups.length > 0 && (
        <View style={styles.groupsWrap}>
          <Text style={styles.handHint}>{t('capsa.groupsLabel')}</Text>
          <View style={styles.groupsRow}>
            {groups.map(({ rawIndex, cards }) => {
              const isSel = sameSet(cards, selection);
              return (
                <View key={rawIndex} style={[styles.groupBox, isSel && styles.groupBoxSel]}>
                  <Pressable
                    style={styles.groupCards}
                    onPress={() => (isSel ? clearSel() : setSelection(cards))}
                  >
                    {cards.map((c, ci) => (
                      <Card key={ci} card={c} size="sm" />
                    ))}
                  </Pressable>
                  <Pressable onPress={() => ungroupAt(player, rawIndex)} style={styles.ungroupBtn}>
                    <Text style={styles.ungroupX}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}
      <View style={styles.handTop}>
        <Text style={styles.handHint}>{t('capsa.selectHint')}</Text>
        <SortToggle />
      </View>
      <ScrollView horizontal style={styles.handScroll} contentContainerStyle={styles.hand}>
        {sortHand(ungrouped, sortMode, true).map((card, i) => (
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
        <Button
          label={t('capsa.group')}
          variant="ghost"
          disabled={!canGroup}
          onPress={() => groupSelection(player)}
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

const SEVEN_RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];

const SEVEN_IDX = 5; // index of the 7, the anchor

/** The cards above and below the 7 on a suit's line (each ordered outward). */
function suitRun(suit: Suit, line: SevenLine): { upper: CardType[]; lower: CardType[] } | null {
  if (!line.opened || line.lowNonAce === null || line.highNonAce === null) return null;
  const hi = SEVEN_RANKS.indexOf(line.highNonAce);
  const lo = SEVEN_RANKS.indexOf(line.lowNonAce);
  const upper: CardType[] = []; // highest → 8 (top down to just above the 7)
  const lower: CardType[] = []; // 6 → lowest (just below the 7 downward)
  if (line.aceHigh) upper.push({ suit, rank: 'A' });
  for (let r = hi; r > SEVEN_IDX; r--) upper.push({ suit, rank: SEVEN_RANKS[r] });
  for (let r = SEVEN_IDX - 1; r >= lo; r--) lower.push({ suit, rank: SEVEN_RANKS[r] });
  if (line.aceLow) lower.push({ suit, rank: 'A' });
  return { upper, lower };
}

/** A small board card showing a corner index; stacked vertically into a column. */
function VCard({ card, first, anchor }: { card: CardType; first: boolean; anchor?: boolean }) {
  const color = isRed(card.suit) ? theme.red : theme.ink;
  return (
    <View style={[styles.vcard, !first && styles.vcardOverlap, anchor && styles.vcardAnchor]}>
      <Text style={[styles.vindex, { color }]}>
        {card.rank}
        {suitGlyph(card.suit)}
      </Text>
    </View>
  );
}

/** Whether a suit's line has reached a terminal and can take no more cards. */
function sevenCollapsed(line: SevenLine, convention: 'none' | 'under' | 'above'): boolean {
  if (!line.opened) return false;
  if (convention === 'above') return line.aceHigh || line.lowNonAce === 2;
  if (convention === 'under') return line.highNonAce === 'K' || line.aceLow;
  return false;
}

/** The player's own discards — private, shown only behind their handoff. */
function DiscardsRow({ player }: { player: PlayerId }) {
  const t = useT();
  const batu = useBatu((s) => s.batu) as BatuState;
  const priv = activePrivateView(batu, player) as { myDiscards?: CardType[] };
  const discards = priv.myDiscards ?? [];
  return (
    <View style={styles.discardsRow}>
      <Text style={styles.discardsLabel}>{t('seven.discards')}:</Text>
      {discards.length > 0 ? (
        <ScrollView horizontal contentContainerStyle={styles.discardsList}>
          {discards.map((c, i) => (
            <Card key={i} card={c} size="sm" />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.discardsLabel}>{t('seven.noDiscards')}</Text>
      )}
    </View>
  );
}

/** Seven: public prompt to skip the all-discards endgame straight to scoring. */
export function NoMorePlays() {
  const t = useT();
  const finish = useBatu((s) => s.finishSevenDiscards);
  return (
    <View style={styles.publicRoot}>
      <Text style={styles.h1}>{t('seven.noPlaysTitle')}</Text>
      <Text style={styles.muted}>{t('seven.noPlaysBody')}</Text>
      <View style={styles.gap} />
      <Button label={t('seven.discardRest')} onPress={finish} />
    </View>
  );
}

function SevenView({ player }: { player: PlayerId }) {
  const t = useT();
  const { batu, names, apply } = useCtx();
  const pub = activePublicView(batu) as SevenPub;
  const priv = activePrivateView(batu, player) as { hand: CardType[] };
  const moves = engine.legalMoves(batu, player) as SevenMove[];
  const sortMode = useBatu((s) => s.sortMode);
  const selection = useBatu((s) => s.selection);
  const selectOne = useBatu((s) => s.selectOne);
  const [aceCard, setAceCard] = useState<CardType | null>(null);

  const plays = moves.filter((m) => m.type === 'play');
  const discards = moves.filter((m) => m.type === 'discard');
  const mustDiscard = plays.length === 0 && discards.length > 0;

  const legalFor = (card: CardType) =>
    moves.filter((m) => m.type === (mustDiscard ? 'discard' : 'play') && sameCard(m.card, card));
  const isSel = (c: CardType) => selection.some((x) => sameCard(x, c));
  const picked = selection[0];

  const conv =
    pub.convention === 'none'
      ? t('seven.aceNone')
      : pub.convention === 'under'
        ? t('seven.aceUnder')
        : t('seven.aceAbove');

  const onSubmit = () => {
    if (!picked) return;
    if (mustDiscard) {
      apply({ type: 'discard', card: picked } as SevenMove);
      return;
    }
    const options = legalFor(picked).filter(
      (m): m is Extract<SevenMove, { type: 'play' }> => m.type === 'play',
    );
    if (options.length > 1) {
      setAceCard(picked); // ace with both ends → prompt
      return;
    }
    if (options.length === 1) apply(options[0]);
  };

  const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

  return (
    <Board>
      <View style={styles.infoRow}>
        <Text style={styles.trump}>{t('seven.aces', { conv })}</Text>
        <Text style={styles.turn}>{t('turn.turn', { name: names[player] })}</Text>
      </View>
      <View style={styles.sevenBoard}>
        {suits.map((suit) => {
          const line = pub.lines[suit];
          const run = suitRun(suit, line);

          // A dead line is compacted into a small pile, highest card on top.
          if (run && sevenCollapsed(line, pub.convention)) {
            const topRank = line.aceHigh ? 'A' : (line.highNonAce as Rank);
            const lowRank = line.aceLow ? 'A' : (line.lowNonAce as Rank);
            const color = isRed(suit) ? theme.red : theme.ink;
            return (
              <View key={suit} style={styles.sevenCol}>
                <View style={styles.upperZone} />
                <View style={styles.pile}>
                  <View style={[styles.vcard, styles.pileShadow]} />
                  <View style={[styles.vcard, styles.pileShadow, styles.pileOffset]} />
                  <View style={[styles.vcard, styles.pileOffset]}>
                    <Text style={[styles.vindex, { color }]}>
                      {topRank}
                      {suitGlyph(suit)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.pileCaption}>
                  {String(lowRank)}–{String(topRank)}
                </Text>
              </View>
            );
          }

          return (
            <View key={suit} style={styles.sevenCol}>
              <View style={styles.upperZone}>
                {run?.upper.map((c, i) => (
                  <VCard key={i} card={c} first={i === 0} />
                ))}
              </View>
              {run ? (
                <VCard card={{ suit, rank: 7 }} first anchor />
              ) : (
                <View style={[styles.vcard, styles.vcardEmpty]}>
                  <Text style={styles.vindexEmpty}>{suitGlyph(suit)}</Text>
                </View>
              )}
              <View style={styles.lowerZone}>
                {run?.lower.map((c, i) => (
                  <VCard key={i} card={c} first={i === 0} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      <DiscardsRow player={player} />
      <View style={styles.spacer} />
      <View style={styles.handTop}>
        <Text style={styles.handHint}>
          {mustDiscard ? t('seven.mustDiscard') : t('seven.playHint')}
        </Text>
        <SortToggle />
      </View>
      <ScrollView horizontal style={styles.handScroll} contentContainerStyle={styles.hand}>
        {sortHand(priv.hand, sortMode).map((card, i) => {
          const legal = mustDiscard || legalFor(card).length > 0;
          return (
            <Card
              key={i}
              card={card}
              selected={isSel(card)}
              disabled={!legal}
              testID={legal ? 'legal-card' : undefined}
              onPress={legal ? () => selectOne(card) : undefined}
            />
          );
        })}
      </ScrollView>

      {aceCard ? (
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
      ) : (
        <View style={styles.actionRow}>
          <Button
            label={mustDiscard ? t('turn.discard') : t('turn.play')}
            disabled={!picked}
            testID="play-submit"
            onPress={onSubmit}
          />
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
  topBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  topSide: { flex: 1, color: theme.accent, fontSize: 15, fontWeight: '700' },
  topTurn: { flex: 2, textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: '800' },
  seatFrame: { alignSelf: 'center', width: '100%', maxWidth: 560, gap: 8, paddingVertical: 6 },
  seatRowEnd: { alignItems: 'center' },
  seatRowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  seatSide: { flex: 1, alignItems: 'center' },
  seatCenterCol: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  seat: {
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  seatActive: { borderColor: theme.accent, backgroundColor: 'rgba(240,199,94,0.12)' },
  seatName: { color: '#e6f2ea', fontSize: 13, fontWeight: '700' },
  seatEmpty: {
    width: 44,
    height: 62,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  adjustCenter: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  bidsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  bidChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    gap: 2,
  },
  bidChipName: { color: '#e6f2ea', fontSize: 14 },
  bidChipVal: { color: theme.accent, fontSize: 24, fontWeight: '800' },
  wonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  scoreStrip: { color: '#fff', fontSize: 13, paddingVertical: 4 },
  handHint: { color: '#e6f2ea', fontSize: 14, marginTop: 4 },
  handTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  hand: {
    flexDirection: 'row',
    gap: 8,
    // Extra top room so a selected/hovered card (lifted up) isn't clipped.
    paddingTop: 30,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  handScroll: { flexGrow: 0 }, // don't stretch vertically — keep the hand at the bottom
  spacer: { flexGrow: 1 }, // pushes the hand block to the bottom of the screen
  bidCenter: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  bidBig: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.accent,
    minHeight: 48,
    textAlign: 'center',
  },
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
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
  rumpunPiles: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingVertical: 4 },
  pileCol: { alignItems: 'center', gap: 3 },
  pileGone: {
    width: 44,
    height: 62,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  pileDowns: { alignItems: 'center', gap: 2 },
  miniBack: {
    width: 40,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#123a5e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  miniBackOverlap: { marginTop: -7 },
  capsaButtons: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  groupsWrap: { alignItems: 'center', gap: 4, paddingBottom: 6 },
  groupsRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  groupBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupBoxSel: { borderColor: theme.accent },
  groupCards: { flexDirection: 'row', gap: 4 },
  ungroupBtn: { marginLeft: 4, paddingHorizontal: 4 },
  ungroupX: { color: '#e6f2ea', fontSize: 18, fontWeight: '800' },
  sevenBoard: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 26,
    paddingTop: 8,
    alignSelf: 'center',
  },
  sevenCol: { alignItems: 'center' },
  upperZone: { height: 60 + 6 * 18, justifyContent: 'flex-end', alignItems: 'center' },
  lowerZone: { alignItems: 'center' },
  vcard: {
    width: 44,
    height: 60,
    borderRadius: 6,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    paddingTop: 3,
    paddingLeft: 4,
  },
  vcardOverlap: { marginTop: -42 }, // show an 18px index strip
  vcardAnchor: { borderColor: theme.accent, borderWidth: 2 },
  vcardEmpty: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vindex: { fontSize: 14, fontWeight: '800' },
  vindexEmpty: { color: '#cfe3d8', fontSize: 18, fontWeight: '700' },
  pile: { alignItems: 'center' },
  pileShadow: { backgroundColor: 'rgba(255,255,255,0.45)' },
  pileOffset: { marginTop: -56 },
  pileCaption: { color: '#cfe3d8', fontSize: 12, marginTop: 6, fontWeight: '700' },
  discardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  discardsLabel: { color: '#cfe3d8', fontSize: 13 },
  discardsList: { flexDirection: 'row', gap: 6 },
  acePrompt: { marginTop: 10, gap: 8, alignItems: 'center' },
  aceButtons: { flexDirection: 'row', gap: 10 },
});
