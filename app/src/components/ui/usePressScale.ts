import { useRef } from 'react';
import { Animated } from 'react-native';

import { motionReduced, useNativeDriver } from '@/lib/motion';

/** 누르는 동안 살짝 작아지는 효과. scale을 transform에, 두 핸들러를 Pressable에 건다. */
export function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) => {
    if (motionReduced()) return;
    Animated.spring(scale, { toValue, speed: 40, bounciness: 6, useNativeDriver }).start();
  };
  return { scale, onPressIn: () => spring(to), onPressOut: () => spring(1) };
}
