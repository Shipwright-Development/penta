import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useT } from '../i18n';
import { theme } from '../theme';
import { useBatu } from '../batuStore';

/** Sort the hand by suit or by rank. */
export function SortToggle() {
  const t = useT();
  const sortMode = useBatu((s) => s.sortMode);
  const setSortMode = useBatu((s) => s.setSortMode);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t('sort.by')}</Text>
      {(['suit', 'rank'] as const).map((m) => (
        <Pressable
          key={m}
          onPress={() => setSortMode(m)}
          accessibilityRole="button"
          style={[styles.pill, sortMode === m && styles.active]}
        >
          <Text style={[styles.text, sortMode === m && styles.activeText]}>
            {m === 'suit' ? t('sort.suit') : t('sort.rank')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: '#cfe3d8', fontSize: 13, marginRight: 2 },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  active: { backgroundColor: theme.accent, borderColor: theme.accent },
  text: { color: '#cfe3d8', fontWeight: '700', fontSize: 13 },
  activeText: { color: theme.accentInk },
});
