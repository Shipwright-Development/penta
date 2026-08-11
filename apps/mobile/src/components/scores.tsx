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
} from '@penta/engine';
import { useT, gameNameKey } from '../i18n';
import { theme } from '../theme';
import { engine } from '../engine';
import { useBatu } from '../batuStore';
import { Board, H1 } from './ui';
import { Button } from './Button';
import { Card } from './Card';

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

  const label = (kind: string, amount?: number) => {
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
      <View style={styles.centerFill}>
        <View style={styles.historyBox}>
          {recent.length === 0 ? (
            <Text style={styles.sub}>{t('history.empty')}</Text>
          ) : (
            recent.map((e, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyName}>{names[e.player]}</Text>
                {e.kind === 'play' && e.cards && e.cards.length > 0 ? (
                  <View style={styles.historyCards}>
                    {e.cards.map((c, ci) => (
                      <Card key={ci} card={c} size="sm" />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.historyLabel}>{label(e.kind, e.amount)}</Text>
                )}
              </View>
            ))
          )}
        </View>
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
      <View style={styles.centerFill}>
        <View style={styles.menu}>
          <Button
            label={t('pause.scoreSheet')}
            variant="ghost"
            onPress={() => setOverlay('sheet')}
          />
          <Button
            label={t('pause.standings')}
            variant="ghost"
            onPress={() => setOverlay('standings')}
          />
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
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheetGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'center',
    alignContent: 'center',
  },
  sub: { color: '#d7ebe0', textAlign: 'center', marginBottom: 12 },
  block: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 18,
    flexGrow: 1,
    flexBasis: 340,
    maxWidth: 560,
  },
  blockTitle: { color: theme.accent, fontWeight: '800', fontSize: 20, marginBottom: 10 },
  trow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  cLabel: { width: 56, color: '#cfe3d8', fontSize: 16 },
  cCell: { flex: 1, color: '#fff', fontSize: 17, textAlign: 'right' },
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
  menu: { gap: 14, width: 320 },
  historyBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 28,
    gap: 16,
    minWidth: 320,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  historyName: { color: theme.accent, fontWeight: '800', fontSize: 17, minWidth: 70 },
  historyCards: { flexDirection: 'row', gap: 4 },
  historyLabel: { color: '#e6f2ea', fontSize: 16 },
});
