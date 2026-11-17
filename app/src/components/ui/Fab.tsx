import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { usePressScale } from '@/components/ui/usePressScale';
import { motionReduced, useNativeDriver } from '@/lib/motion';
import { colors, radius, space } from '@/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Fab({ label = '+ 올리기', onPress }: { label?: string; onPress: () => void }) {
  const press = usePressScale(0.94);
  // 화면에 들어올 때 한 번 톡 튀어나온다.
  const appear = useRef(new Animated.Value(motionReduced() ? 1 : 0)).current;
  useEffect(() => {
    if (motionReduced()) return;
    const anim = Animated.spring(appear, {
      toValue: 1,
      delay: 250,
      speed: 14,
      bounciness: 10,
      useNativeDriver,
    });
    anim.start();
    return () => anim.stop();
  }, [appear]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      style={[
        styles.fab,
        { opacity: appear, transform: [{ scale: Animated.multiply(appear, press.scale) }] },
      ]}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}>
      <Text style={styles.text}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: space.screen,
    bottom: space.screen,
    backgroundColor: colors.primary,
    borderRadius: radius.fab,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { color: colors.bg, fontSize: 14, fontWeight: '700' },
});
