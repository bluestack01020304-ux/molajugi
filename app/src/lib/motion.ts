import { AccessibilityInfo, Platform } from 'react-native';

// 애니메이션 공통 설정. 기기에서 "동작 줄이기"를 켠 사용자에게는 움직임을 생략한다.

let reduced = false;
try {
  if (Platform.OS === 'web') {
    reduced =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } else {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        reduced = v;
      })
      .catch(() => {});
  }
} catch {
  // 확인할 수 없으면 애니메이션을 켠 채로 둔다.
}

export function motionReduced(): boolean {
  return reduced;
}

/** 웹에는 네이티브 애니메이션 드라이버가 없다. */
export const useNativeDriver = Platform.OS !== 'web';
