import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScratchCard } from '@/components/ScratchCard';
import { Button } from '@/components/ui/Button';
import { colors, space, type } from '@/lib/theme';

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
          <Text style={styles.burst}>🎉</Text>
          <Text style={styles.winTitle}>당첨!</Text>
          <Button
            title="바코드 보기"
            onPress={() => router.replace({ pathname: '/gifticon/[id]', params: { id } })}
          />
        </View>
      )}
      {revealed && result === 'miss' && (
        <View style={styles.actions}>
          <Text style={styles.missTitle}>꽝</Text>
          <Text style={styles.missSub}>아쉽네요, 꽝이에요</Text>
          <Button
            variant="soft"
            title="같은 기프티콘 다시 뽑기"
            onPress={() => router.replace({ pathname: '/listing/[id]', params: { id: listing_id } })}
          />
          <Button variant="outline" title="목록으로" onPress={() => router.replace('/(tabs)')} />
        </View>
      )}
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
