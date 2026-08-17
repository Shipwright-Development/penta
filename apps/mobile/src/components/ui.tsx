import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useT } from '../i18n';
import { useBatu } from '../batuStore';
import { Button } from './Button';
import { LangToggle } from './LangToggle';

/** Shared header: brand, score access, menu, and the language switch. */
export function Header({ showControls = true }: { showControls?: boolean }) {
  const t = useT();
  const setOverlay = useBatu((s) => s.setOverlay);
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>{t('app.name')}</Text>
      <View style={styles.headerRight}>
        {showControls && (
          <>
            <Button
              label={t('common.moves')}
              variant="ghost"
              small
              onPress={() => setOverlay('history')}
            />
            <Button
              label={t('common.scores')}
              variant="ghost"
              small
              onPress={() => setOverlay('sheet')}
            />
            <Button
              label={t('common.menu')}
              variant="ghost"
              small
              onPress={() => setOverlay('menu')}
            />
          </>
        )}
        <LangToggle />
      </View>
    </View>
  );
}

/** A centered public screen (dark green felt), sharing the board's outer margin. */
export function Public({ children, controls }: { children: ReactNode; controls?: boolean }) {
  return (
    <View style={styles.publicRoot}>
      <Header showControls={controls} />
      <View style={styles.publicCenter}>{children}</View>
    </View>
  );
}

/** A top-aligned game board / scrollable screen. */
export function Board({ children, controls = true }: { children: ReactNode; controls?: boolean }) {
  return (
    <View style={styles.boardRoot}>
      <Header showControls={controls} />
      {children}
    </View>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  publicRoot: { flex: 1, backgroundColor: theme.felt, paddingHorizontal: 16, paddingBottom: 16 },
  publicCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  boardRoot: { flex: 1, backgroundColor: theme.felt, paddingHorizontal: 16, paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  brand: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h1: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center' },
  muted: { fontSize: 15, color: '#d7ebe0', textAlign: 'center' },
});
