import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';

import { Logo } from '@/components/Logo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Icon, type IconName } from '@/components/ui/Icon';
import { FrameSizeContext, frameLayout } from '@/lib/frame';
import { colors, radius } from '@/lib/theme';

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'ticket-outline', text: '안 쓰는 기프티콘을 올리고' },
  { icon: 'sparkles-outline', text: '정해진 확률로 싸게 뽑고' },
  { icon: 'barcode-outline', text: '당첨되면 바로 바코드 확인' },
];

// 웹 전용 CSS 속성 (React Native 타입에는 없다)
const backdropWeb = {
  backgroundImage: [
    `radial-gradient(circle at 12% 18%, ${colors.primarySoft} 0, transparent 42%)`,
    `radial-gradient(circle at 88% 85%, ${colors.primarySoft} 0, transparent 38%)`,
    `linear-gradient(160deg, ${colors.backdrop} 0%, ${colors.bg2} 70%)`,
  ].join(', '),
} as ViewStyle;
const phoneShadowWeb = {
  boxShadow: '0 24px 64px rgba(27, 42, 107, 0.16), 0 2px 8px rgba(27, 42, 107, 0.06)',
} as ViewStyle;

function BrandPanel() {
  return (
    <View style={styles.brand}>
      <FadeIn>
        <Logo size={72} />
      </FadeIn>
      <FadeIn delay={80}>
        <Text style={styles.brandTitle}>몰아주기</Text>
        <Text style={styles.brandTagline}>잠든 기프티콘, 뽑기로 몰아주기</Text>
      </FadeIn>
      <View style={styles.points}>
        {POINTS.map((p, i) => (
          <FadeIn key={p.text} delay={180 + i * 90} style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon name={p.icon} size={18} color={colors.primary} />
            </View>
            <Text style={styles.pointText}>{p.text}</Text>
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * 컴퓨터처럼 넓은 웹 창에서는 앱을 폰 크기 틀 안에 가운데로 띄우고 바깥을 배경으로 채운다.
 * 폰과 좁은 창에서는 아무것도 바꾸지 않는다. 창 크기가 바뀌어도 children이 다시 만들어지지 않게
 * 두 경우 모두 같은 구조로 그린다.
 */
export function WebFrame({ children }: { children: ReactNode }) {
  const win = useWindowDimensions();
  const f = frameLayout(win.width, win.height, Platform.OS === 'web');

  return (
    <View style={[styles.backdrop, f.framed && backdropWeb]}>
      {f.showBrand && <BrandPanel />}
      <View
        style={
          f.framed
            ? [styles.phone, phoneShadowWeb, { width: f.width, height: f.height }, f.floating && styles.floating]
            : styles.fill
        }>
        <FrameSizeContext.Provider value={{ width: f.width, height: f.height }}>
          {children}
        </FrameSizeContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 72,
    backgroundColor: colors.bg,
  },
  fill: { flex: 1, alignSelf: 'stretch' },
  phone: { backgroundColor: colors.bg, overflow: 'hidden' },
  floating: { borderRadius: 28, borderWidth: 1, borderColor: colors.line },
  brand: { width: 340, gap: 18 },
  brandTitle: { fontSize: 44, fontWeight: '900', color: colors.ink, letterSpacing: -1 },
  brandTagline: { fontSize: 18, color: colors.sub, marginTop: 6 },
  points: { gap: 12, marginTop: 10 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { fontSize: 15, color: colors.ink, fontWeight: '500' },
});
