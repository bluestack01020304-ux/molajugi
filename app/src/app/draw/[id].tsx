import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Confetti } from '@/components/Confetti';
import { ScratchCard } from '@/components/ScratchCard';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/FadeIn';
import { motionReduced, useNativeDriver } from '@/lib/motion';
import { colors, space, type } from '@/lib/theme';

/** 당첨 문구: 톡 튀어 오르며 나타난다. */
function WinTitle() {
  const scale = useRef(new Animated.Value(motionReduced() ? 1 : 0.3)).current;
  useEffect(() => {
    if (motionReduced()) return;
    Animated.spring(scale, { toValue: 1, speed: 8, bounciness: 18, useNativeDriver }).start();
  }, [scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Text style={styles.burst}>🎉</Text>
      <Text style={styles.winTitle}>당첨!</Text>
    </Animated.View>
  );
}

/** 꽝 문구: 좌우로 짧게 흔들린다. */
function MissTitle() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motionReduced()) return;
    Animated.sequence(
      [-10, 10, -6, 6, 0].map((toValue) =>
        Animated.timing(x, { toValue, duration: 70, useNativeDriver }),
      ),
    ).start();
  }, [x]);
  return (
    <Animated.View style={{ transform: [{ translateX: x }] }}>
      <Text style={styles.missTitle}>꽝</Text>
      <Text style={styles.missSub}>아쉽네요, 꽝이에요</Text>
    </Animated.View>
  );
}

export default function DrawResultScreen() {
  const { id, result, listing_id } = useLocalSearchParams<{
    id: string;
    result: string;
    listing_id: string;
  }>();
  const [revealed, setRevealed] = useState(false);

  if (result !== 'win' && result !== 'miss') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '뽑기 결과', headerBackVisible: false }} />
        <Text style={styles.muted}>결과를 불러올 수 없어요</Text>
        <Button variant="outline" title="목록으로" onPress={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '뽑기 결과', headerBackVisible: false }} />
      <ScratchCard result={result} onRevealed={() => setRevealed(true)} />
      {!revealed && <Button variant="outline" title="긁는 중…" disabled />}
      {revealed && result === 'win' && (
        <View style={styles.actions}>
          <WinTitle />
          <FadeIn delay={250}>
            <Button
              title="바코드 보기"
              onPress={() => router.replace({ pathname: '/gifticon/[id]', params: { id } })}
            />
          </FadeIn>
        </View>
      )}
      {revealed && result === 'miss' && (
        <View style={styles.actions}>
          <MissTitle />
          <FadeIn delay={250} style={styles.actions}>
            <Button
              variant="soft"
              title="같은 기프티콘 다시 뽑기"
              onPress={() => router.replace({ pathname: '/listing/[id]', params: { id: listing_id } })}
            />
            <Button variant="outline" title="목록으로" onPress={() => router.replace('/(tabs)')} />
          </FadeIn>
        </View>
      )}
      {revealed && result === 'win' && <Confetti />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: space.screen, gap: space.screen },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.screen,
    backgroundColor: colors.bg,
    padding: space.screen,
  },
  muted: { color: colors.sub, fontSize: 15 },
  actions: { gap: 10, alignItems: 'stretch' },
  burst: { fontSize: 54, textAlign: 'center' },
  winTitle: { fontSize: 34, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  missTitle: { fontSize: 28, fontWeight: '800', color: colors.sub, textAlign: 'center' },
  missSub: { ...type.meta, textAlign: 'center', marginBottom: 4 },
});
