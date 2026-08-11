import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  small?: boolean;
  testID?: string;
}

export function Button({ label, onPress, disabled, variant = 'primary', small, testID }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[styles.label, small && styles.labelSmall, variant === 'ghost' && styles.labelGhost]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  primary: { backgroundColor: theme.accent },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
  danger: { backgroundColor: theme.danger },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  label: { fontSize: 16, fontWeight: '700', color: theme.accentInk },
  labelSmall: { fontSize: 14 },
  labelGhost: { color: theme.text, fontWeight: '600' },
});
