import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLang } from '../i18n';
import { theme } from '../theme';

/** English / Indonesian switch, usable on any screen. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <View style={styles.row}>
      {(['en', 'id'] as const).map((l) => (
        <Pressable
          key={l}
          onPress={() => setLang(l)}
          accessibilityRole="button"
          style={[styles.pill, lang === l && styles.active]}
        >
          <Text style={[styles.text, lang === l && styles.activeText]}>
            {l === 'en' ? 'EN' : 'ID'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  active: { backgroundColor: theme.accent, borderColor: theme.accent },
  text: { color: theme.muted, fontWeight: '700', fontSize: 13 },
  activeText: { color: theme.accentInk },
});
