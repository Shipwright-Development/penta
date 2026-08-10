import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useT } from '../src/i18n';
import { theme } from '../src/theme';
import { Button } from '../src/components/Button';
import { LangToggle } from '../src/components/LangToggle';
import { hasSave } from '../src/engine';
import { useBatu } from '../src/batuStore';

export default function TitleScreen() {
  const t = useT();
  const router = useRouter();
  const resume = useBatu((s) => s.resume);
  const canResume = hasSave();

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <LangToggle />
      </View>
      <View style={styles.center}>
        <Text style={styles.title}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('title.tagline')}</Text>
        <View style={styles.actions}>
          <Button label={t('title.new')} onPress={() => router.push('/setup')} />
          {canResume && (
            <Button
              label={t('title.resume')}
              variant="ghost"
              onPress={() => {
                if (resume()) router.push('/play');
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.felt },
  top: { padding: 16, alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 64, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  tagline: { fontSize: 16, color: '#e6f2ea' },
  actions: { marginTop: 28, gap: 12, alignItems: 'center' },
});
