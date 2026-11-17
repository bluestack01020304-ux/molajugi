import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { usePressScale } from '@/components/ui/usePressScale';
import { colors, radius, type } from '@/lib/theme';

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'danger';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const press = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.base,
        styles[variant],
        disabled && (filled ? styles.disabledFilled : styles.disabledFaded),
        style,
        { transform: [{ scale: press.scale }] },
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          style={[styles.text, { color: disabled && filled ? colors.bg : fg }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}>
          {title}
        </Text>
      )}
    </AnimatedPressable>
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
  text: { ...type.button, textAlign: 'center' },
  primary: { backgroundColor: colors.primary },
  soft: { backgroundColor: colors.primarySoft },
  outline: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.danger },
  disabledFilled: { backgroundColor: colors.faint },
  disabledFaded: { opacity: 0.5 },
});
