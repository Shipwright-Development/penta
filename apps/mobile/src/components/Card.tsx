import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { Card as CardType } from '@penta/engine';
import { theme } from '../theme';
import { isRed, suitGlyph } from '../format';

interface Props {
  card: CardType;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: 'sm' | 'md';
  testID?: string;
}

/** A playing card drawn in code (no image assets) — rank + suit glyph. */
export function Card({ card, onPress, disabled, selected, size = 'md', testID }: Props) {
  const color = isRed(card.suit) ? theme.red : theme.ink;
  const dim = disabled === true; // grey out any card explicitly marked unplayable

  const face = (
    <View
      style={[
        styles.card,
        size === 'sm' && styles.cardSm,
        selected && styles.selected,
        dim && styles.dim,
      ]}
    >
      <Text style={[styles.rank, size === 'sm' && styles.rankSm, { color }]}>{card.rank}</Text>
      <Text style={[styles.suit, size === 'sm' && styles.suitSm, { color }]}>
        {suitGlyph(card.suit)}
      </Text>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        testID={testID}
        // `hovered` is a react-native-web extension not in the RN types.
        style={(state) => ((state as { hovered?: boolean }).hovered ? styles.hover : null)}
      >
        {face}
      </Pressable>
    );
  }
  return face;
}

/** A face-down card back — used for hidden cards (Rumpun piles, hidden hands). */
export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <View style={[styles.card, size === 'sm' && styles.cardSm, styles.back]}>
      <View style={styles.backInner} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 62,
    height: 88,
    borderRadius: 8,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  cardSm: { width: 44, height: 62 },
  selected: {
    borderColor: theme.accent,
    borderWidth: 3,
    transform: [{ translateY: -8 }],
  },
  dim: { opacity: 0.35 },
  hover: { transform: [{ translateY: -6 }] },
  back: { backgroundColor: '#123a5e', borderColor: '#0c2b46', padding: 5 },
  backInner: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: '#1c4f7a',
  },
  rank: { fontSize: 22, fontWeight: '700' },
  rankSm: { fontSize: 16 },
  suit: { fontSize: 26, marginTop: 2 },
  suitSm: { fontSize: 18 },
});
