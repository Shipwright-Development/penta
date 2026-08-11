import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  GAME_ORDER,
  PLAYER_IDS,
  cumulativeScores,
  roundTo2dp,
  type PlayerId,
  type BatuState,
} from '@penta/engine';
import { useT, gameNameKey } from '../i18n';
import { theme } from '../theme';
import { suitGlyph } from '../format';
import { engine } from '../engine';
import { useBatu } from '../batuStore';
import { Public, H1, Muted, Panel } from './ui';
import { Button } from './Button';
import { Card } from './Card';

function useNames() {
  return useBatu((s) => s.names);
}

// ---------------------------------------------------------------------------

export function DealPrompt() {
  const t = useT();
  const names = useNames();
  const batu = useBatu((s) => s.batu) as BatuState;
  const deal = useBatu((s) => s.deal);
  const gameId = GAME_ORDER[batu.gameIndex];
  return (
    <Public controls>
      <Panel>
        <H1>{t('deal.next', { game: t(gameNameKey(gameId)), n: batu.roundIndex + 1 })}</H1>
        <Muted>{t('deal.dealer', { name: names[batu.dealer] })}</Muted>
        <View style={styles.gap} />
        <Button label={t('deal.button')} onPress={deal} />
      </Panel>
    </Public>
  );
}

export function Ritual() {
  const t = useT();
  const names = useNames();
  const batu = useBatu((s) => s.batu) as BatuState;
  const accept = useBatu((s) => s.acceptRitual);
  const deal = batu.lastDeal;
  return (
    <Public>
      <Panel>
        <H1>{t('ritual.title')}</H1>
        <Muted>{t('ritual.flip')}</Muted>
        {deal && <Card card={deal.middleCard} />}
        {deal && (
          <Text style={styles.big}>
            {t('ritual.recipient', { name: names[deal.firstRecipient] })}
          </Text>
        )}
        <View style={styles.gap} />
        <Button label={t('ritual.continue')} onPress={accept} />
      </Panel>
    </Public>
  );
}

export function Handoff({ player }: { player: PlayerId }) {
  const t = useT();
  const names = useNames();
  const reveal = useBatu((s) => s.reveal);
  return (
    <Public controls>
      <Panel>
        <H1>{t('handoff.pass', { name: names[player] })}</H1>
        <Muted>{t('handoff.lookAway')}</Muted>
        <View style={styles.gap} />
        <Button label={t('handoff.reveal')} onPress={reveal} />
      </Panel>
    </Public>
  );
}

export function TrickResult() {
  const t = useT();
  const names = useNames();
  const lastTrick = useBatu((s) => s.lastTrick);
  const clear = useBatu((s) => s.clearTrick);
  if (!lastTrick) return null;
  return (
    <Public>
      <H1>{t('trick.wonBy', { name: names[lastTrick.winner] })}</H1>
      <View style={styles.trickRow}>
        {lastTrick.plays.map((p, i) => (
          <View key={i} style={styles.slot}>
            <Text style={styles.slotName}>{names[p.player]}</Text>
            <Card card={p.card} />
          </View>
        ))}
      </View>
      <View style={styles.gap} />
      <Button label={t('reveal.continue')} onPress={clear} />
    </Public>
  );
}

export function RoundSummaryView() {
  const t = useT();
  const names = useNames();
  const batu = useBatu((s) => s.batu) as BatuState;
  const info = useBatu((s) => s.summaryPending);
  const accept = useBatu((s) => s.acceptSummary);
  if (!info) return null;

  const totals = cumulativeScores(batu.sheet[info.gameId]);
  const isWin = (p: PlayerId) => info.result.winners.includes(p);
  const isLose = (p: PlayerId) => info.result.losers.includes(p);

  return (
    <Public>
      <H1>{t('summary.title', { game: t(gameNameKey(info.gameId)), n: info.roundIndex + 1 })}</H1>
      <View style={styles.table}>
        <View style={styles.trow}>
          <Text style={[styles.th, styles.cName]} />
          <Text style={[styles.th, styles.cNum]}>{t('summary.roundScore')}</Text>
          <Text style={[styles.th, styles.cNum]}>{t('summary.total')}</Text>
          <Text style={[styles.th, styles.cMark]} />
        </View>
        {PLAYER_IDS.map((p) => (
          <View key={p} style={styles.trow}>
            <Text style={[styles.td, styles.cName]}>{names[p]}</Text>
            <Text style={[styles.td, styles.cNum]}>{info.result.scores[p]}</Text>
            <Text style={[styles.td, styles.cNum]}>{totals[p]}</Text>
            <Text style={[styles.td, styles.cMark]}>
              {isWin(p) ? '□' : ''}
              {isLose(p) ? '▼' : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.gap} />
      <Button label={t('summary.continue')} onPress={accept} />
    </Public>
  );
}

export function PentaTallyView() {
  const t = useT();
  const names = useNames();
  const batu = useBatu((s) => s.batu) as BatuState;
  const gameId = useBatu((s) => s.tallyPending);
  const accept = useBatu((s) => s.acceptTally);
  if (!gameId) return null;
  const tally = batu.pentaTallies[gameId];
  if (!tally) return null;

  return (
    <Public>
      <H1>{t('tally.title', { game: t(gameNameKey(gameId)) })}</H1>
      <View style={styles.table}>
        <View style={styles.trow}>
          <Text style={[styles.th, styles.cName]} />
          <Text style={[styles.th, styles.cNum]}>{t('tally.placement')}</Text>
          <Text style={[styles.th, styles.cNum]}>{t('tally.markers')}</Text>
          <Text style={[styles.th, styles.cNum]}>{t('tally.penta')}</Text>
        </View>
        {PLAYER_IDS.map((p) => (
          <View key={p} style={styles.trow}>
            <Text style={[styles.td, styles.cName]}>{names[p]}</Text>
            <Text style={[styles.td, styles.cNum]}>{roundTo2dp(tally.placement[p])}</Text>
            <Text style={[styles.td, styles.cNum]}>
              {tally.markers[p] > 0 ? `+${tally.markers[p]}` : tally.markers[p]}
            </Text>
            <Text style={[styles.td, styles.cNum, styles.strong]}>
              {roundTo2dp(tally.penta[p])}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.gap} />
      <Button label={t('tally.continue')} onPress={accept} />
    </Public>
  );
}

export function Champion() {
  const t = useT();
  const router = useRouter();
  const names = useNames();
  const batu = useBatu((s) => s.batu) as BatuState;
  const abandon = useBatu((s) => s.abandon);
  const standings = engine.standings(batu);
  const winners = engine.champion(batu);

  return (
    <Public>
      <H1>{winners.length > 1 ? t('champion.shared') : t('champion.title')}</H1>
      <Text style={styles.trophy}>🏆 {winners.map((p) => names[p]).join(', ')}</Text>
      <View style={styles.table}>
        {PLAYER_IDS.map((p) => (
          <View key={p} style={styles.trow}>
            <Text style={[styles.td, styles.cName]}>{names[p]}</Text>
            <Text style={[styles.td, styles.cNum, styles.strong]}>{roundTo2dp(standings[p])}</Text>
          </View>
        ))}
      </View>
      <View style={styles.gap} />
      <Button
        label={t('champion.newBatu')}
        onPress={() => {
          abandon();
          router.replace('/setup');
        }}
      />
    </Public>
  );
}

// re-export suit helper so trump reveal can render a glyph inline
export { suitGlyph };

const styles = StyleSheet.create({
  gap: { height: 8 },
  big: { fontSize: 20, color: '#fff', fontWeight: '600' },
  trophy: { fontSize: 26, color: theme.accent, fontWeight: '800' },
  trickRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', flexWrap: 'wrap' },
  slot: { alignItems: 'center', gap: 4 },
  slotName: { color: '#e6f2ea', fontSize: 13 },
  table: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 10,
    minWidth: 320,
  },
  trow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  th: { color: theme.accent, fontSize: 13, fontWeight: '700' },
  td: { color: '#fff', fontSize: 16 },
  cName: { flex: 2 },
  cNum: { flex: 1, textAlign: 'right' },
  cMark: { flex: 1, textAlign: 'right', fontSize: 18 },
  strong: { fontWeight: '800' },
});
