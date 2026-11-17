import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { motionReduced, useNativeDriver } from '@/lib/motion';

/** 처음 나타날 때 살짝 올라오며 서서히 보인다. 목록에서는 delay로 한 줄씩 차례로 띄운다. */
export function FadeIn({
  children,
  delay = 0,
  offset = 10,
  style,
}: {
  children: ReactNode;
  delay?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const still = motionReduced();
  const progress = useRef(new Animated.Value(still ? 1 : 0)).current;

  useEffect(() => {
    if (still) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, still]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** 목록 n번째 줄의 등장 지연(ms). 뒤쪽 줄이 너무 늦지 않게 상한을 둔다. */
export function staggerDelay(index: number): number {
  return Math.min(index, 8) * 45;
}
