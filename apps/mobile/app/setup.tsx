import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useT } from '../src/i18n';
import { theme } from '../src/theme';
import { Button } from '../src/components/Button';
import { LangToggle } from '../src/components/LangToggle';
import { useBatu } from '../src/batuStore';

export default function SetupScreen() {
  const t = useT();
  const router = useRouter();
  const newBatu = useBatu((s) => s.newBatu);

  const [names, setNames] = useState(['', '', '', '']);
  const [undoEnabled, setUndoEnabled] = useState(true);

  const trimmed = names.map((n) => n.trim());
  const ready = trimmed.every((n) => n.length > 0);

  const onStart = () => {
    if (!ready) return;
    newBatu(trimmed, { undoEnabled });
    router.push('/play');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('setup.title')}</Text>
        <LangToggle />
      </View>
      <Text style={styles.hint}>{t('setup.seatHint')}</Text>

      <View style={styles.names}>
        {names.map((value, i) => (
          <View key={i} style={styles.field}>
            <Text style={styles.label}>{t('setup.player', { n: i + 1 })}</Text>
            <TextInput
              style={styles.input}
              value={value}
              placeholder={t('setup.name')}
              placeholderTextColor={theme.muted}
              onChangeText={(text) => {
                const next = [...names];
                next[i] = text;
                setNames(next);
              }}
            />
          </View>
        ))}
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>{t('setup.undo')}</Text>
        <Pressable
          accessibilityRole="switch"
          onPress={() => setUndoEnabled((v) => !v)}
          style={[styles.toggle, undoEnabled && styles.toggleOn]}
        >
          <Text style={[styles.toggleText, undoEnabled && styles.toggleTextOn]}>
            {undoEnabled ? t('setup.on') : t('setup.off')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.startRow}>
        <Button label={t('setup.start')} onPress={onStart} disabled={!ready} />
        {!ready && <Text style={styles.warn}>{t('setup.fillAll')}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.felt, padding: 24, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  hint: { color: '#d7ebe0', fontSize: 14 },
  names: { gap: 12, maxWidth: 420 },
  field: { gap: 4 },
  label: { color: '#e6f2ea', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: theme.panel,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  toggleOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  toggleText: { color: '#e6f2ea', fontWeight: '700' },
  toggleTextOn: { color: theme.accentInk },
  startRow: { marginTop: 8, gap: 8, alignItems: 'flex-start' },
  warn: { color: theme.accent, fontSize: 13 },
});
