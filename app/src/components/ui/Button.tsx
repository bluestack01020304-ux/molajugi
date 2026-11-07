import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, type } from '@/lib/theme';

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || busy;
  const filled = variant === 'primary' || variant === 'soft';
  const fg =
    variant === 'primary' ? colors.bg : variant === 'danger' ? colors.danger : variant === 'soft' ? colors.primary : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        styles[variant],
        disabled && (filled ? styles.disabledFilled : styles.disabledFaded),
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, { color: disabled && filled ? colors.bg : fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: type.button,
  primary: { backgroundColor: colors.primary },
  soft: { backgroundColor: colors.primarySoft },
  outline: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.danger },
  disabledFilled: { backgroundColor: colors.faint },
  disabledFaded: { opacity: 0.5 },
});
