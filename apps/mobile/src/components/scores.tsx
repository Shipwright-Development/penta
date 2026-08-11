import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  GAME_ORDER,
  PLAYER_IDS,
  cumulativeScores,
  roundTo2dp,
  type GameId,
  type PlayerId,
  type BatuState,
  type Card,
} from '@penta/engine';
import { useT, gameNameKey } from '../i18n';
import { theme } from '../theme';
import { cardText } from '../format';
import { engine } from '../engine';
import { useBatu } from '../batuStore';
import { Board, H1 } from './ui';
import { Button } from './Button';
import { LangToggle } from './LangToggle';

function markerText(winners: PlayerId[], losers: PlayerId[], p: PlayerId): string {
  return `${winners.includes(p) ? '□' : ''}${losers.includes(p) ? '▼' : ''}`;
}

export function ScoreSheet() {
  const t = useT();
  const names = useBatu((s) => s.names);
  const batu = useBatu((s) => s.batu) as BatuState;
  const setOverlay = useBatu((s) => s.setOverlay);

  return (
    <Board controls={false}>
      <View style={styles.top}>
        <H1>{t('sheet.title')}</H1>
        <Button label={t('sheet.close')} variant="ghost" small onPress={() => setOverlay('none')} />
      </View>
      <View style={styles.sheetGrid}>
        {GAME_ORDER.map((gid) => (
          <GameBlock key={gid} gameId={gid} names={names} batu={batu} />
        ))}
      </View>
    </Board>
  );
}

function GameBlock({ gameId, names, batu }: { gameId: GameId; names: string[]; batu: BatuState }) {
  const t = useT();
  const rounds = batu.sheet[gameId];
  const tally = batu.pentaTallies[gameId];

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{t(gameNameKey(gameId))}</Text>
      <View style={styles.trow}>
        <Text style={[styles.cLabel]} />
        {PLAYER_IDS.map((p) => (
          <Text key={p} style={styles.cCell}>
            {names[p]}
          </Text>
        ))}
      </View>
      {[0, 1, 2, 3].map((r) => {
        const played = rounds.length > r;
        const running = played ? cumulativeScores(rounds.slice(0, r + 1)) : null;
        const rr = rounds[r];
        return (
          <View key={r} style={styles.trow}>
            <Text style={styles.cLabel}>{t('sheet.round', { n: r + 1 })}</Text>
            {PLAYER_IDS.map((p) => (
              <Text key={p} style={styles.cCell}>
                {running ? `${running[p]} ${markerText(rr.winners, rr.losers, p)}` : '·'}
              </Text>
            ))}
          </View>
        );
      })}
      {tally && (
        <View style={styles.trow}>
          <Text style={[styles.cLabel, styles.pentaLabel]}>{t('tally.penta')}</Text>
          {PLAYER_IDS.map((p) => (
            <Text key={p} style={[styles.cCell, styles.pentaCell]}>
              {roundTo2dp(tally.penta[p])}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export function Standings() {
  const t = useT();
  const names = useBatu((s) => s.names);
  const batu = useBatu((s) => s.batu) as BatuState;
  const setOverlay = useBatu((s) => s.setOverlay);
  const standings = engine.standings(batu);
  const tallied = Object.keys(batu.pentaTallies).length;

  return (
    <Board controls={false}>
      <View style={styles.top}>
        <H1>{t('standings.title')}</H1>
        <Button label={t('sheet.close')} variant="ghost" small onPress={() => setOverlay('none')} />
      </View>
      <Text style={styles.sub}>{t('standings.tallied', { n: tallied })}</Text>
      <View style={styles.standingsBox}>
        {PLAYER_IDS.map((p) => (
          <View key={p} style={styles.standRow}>
            <Text style={styles.standName}>{names[p]}</Text>
            <Text style={styles.standScore}>{roundTo2dp(standings[p])}</Text>
          </View>
        ))}
      </View>
    </Board>
  );
}

export function History() {
  const t = useT();
  const names = useBatu((s) => s.names);
  const history = useBatu((s) => s.history);
  const setOverlay = useBatu((s) => s.setOverlay);
  const recent = history.slice(-5).reverse();

  const label = (kind: string, cards?: Card[], amount?: number) => {
    if (kind === 'play') return t('log.played', { cards: (cards ?? []).map(cardText).join(' ') });
    if (kind === 'pass') return t('log.passed');
    if (kind === 'pass3') return t('log.passed3');
    if (kind === 'bid') return t('log.bid');
    if (kind === 'adjust') return t('log.adjust', { n: amount ?? 0 });
    return t('log.discard');
  };

  return (
    <Board controls={false}>
      <View style={styles.top}>
        <H1>{t('history.title')}</H1>
        <Button label={t('sheet.close')} variant="ghost" small onPress={() => setOverlay('none')} />
      </View>
      <View style={styles.historyBox}>
        {recent.length === 0 ? (
          <Text style={styles.sub}>{t('history.empty')}</Text>
        ) : (
          recent.map((e, i) => (
            <Text key={i} style={styles.historyItem}>
              <Text style={styles.historyName}>{names[e.player]}</Text>{' '}
              {label(e.kind, e.cards, e.amount)}
            </Text>
          ))
        )}
      </View>
    </Board>
  );
}

export function Menu() {
  const t = useT();
  const router = useRouter();
  const setOverlay = useBatu((s) => s.setOverlay);
  const abandon = useBatu((s) => s.abandon);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  return (
    <Board controls={false}>
      <View style={styles.top}>
        <H1>{t('pause.title')}</H1>
        <Button label={t('pause.resumeGame')} small onPress={() => setOverlay('none')} />
      </View>
      <View style={styles.menu}>
        <Button label={t('pause.scoreSheet')} variant="ghost" onPress={() => setOverlay('sheet')} />
        <Button
          label={t('pause.standings')}
          variant="ghost"
          onPress={() => setOverlay('standings')}
        />
        <View style={styles.langRow}>
          <Text style={styles.langLabel}>{t('pause.language')}</Text>
          <LangToggle />
        </View>
        <Button
          label={confirmAbandon ? t('pause.abandonConfirm') : t('pause.abandon')}
          variant="danger"
          onPress={() => {
            if (confirmAbandon) {
              abandon();
              router.replace('/');
            } else {
              setConfirmAbandon(true);
            }
          }}
        />
      </View>
    </Board>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  sub: { color: '#d7ebe0', textAlign: 'center', marginBottom: 12 },
  block: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, width: 336 },
  blockTitle: { color: theme.accent, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  trow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1 },
  cLabel: { width: 36, color: '#cfe3d8', fontSize: 12 },
  cCell: { flex: 1, color: '#fff', fontSize: 13, textAlign: 'right' },
  pentaLabel: { color: theme.accent, fontWeight: '700' },
  pentaCell: { fontWeight: '800', color: theme.accent },
  standingsBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  standRow: { flexDirection: 'row', justifyContent: 'space-between' },
  standName: { color: '#fff', fontSize: 18 },
  standScore: { color: '#fff', fontSize: 18, fontWeight: '800' },
  menu: { gap: 12, maxWidth: 360, marginTop: 12 },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  langLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  historyBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 16,
    gap: 10,
    maxWidth: 460,
  },
  historyItem: { color: '#e6f2ea', fontSize: 16 },
  historyName: { color: theme.accent, fontWeight: '800' },
});
