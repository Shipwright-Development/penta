import { Text, View, StyleSheet } from 'react-native';
import { STANDARD_DECK } from '@penta/engine';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Penta</Text>
      <Text style={styles.subtitle}>Engine linked · {STANDARD_DECK.length}-card deck</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
