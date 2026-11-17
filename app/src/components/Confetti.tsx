import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { motionReduced, useNativeDriver } from '@/lib/motion';
import { colors } from '@/lib/theme';

const PALETTE = [colors.primary, colors.gold, colors.pink, colors.okFg, colors.primarySoft];
const COUNT = 36;

/** 당첨 때 가운데에서 한 번 터지는 색종이. 부모 위에 겹쳐 그리고 터치는 통과시킨다. */
export function Confetti() {
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const angle = (Math.PI * 2 * i) / COUNT + Math.random() * 0.5;
        const reach = 90 + Math.random() * 130;
        return {
          dx: Math.cos(angle) * reach,
          up: -Math.abs(Math.sin(angle)) * reach - 40,
          fall: 160 + Math.random() * 120,
          spin: `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)}deg`,
          size: 6 + Math.random() * 6,
          round: i % 3 === 0,
          color: PALETTE[i % PALETTE.length],
        };
      }),
    [],
  );

  useEffect(() => {
    if (motionReduced()) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 1700,
      easing: Easing.out(Easing.quad),
      useNativeDriver,
    });
    anim.start();
    return () => anim.stop();
  }, [progress]);

  if (motionReduced()) return null;

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.round ? p.size : p.size * 1.8,
            borderRadius: p.round ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, p.up, p.fall],
                }),
              },
              { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.spin] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
