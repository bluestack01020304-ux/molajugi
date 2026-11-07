import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScratchCard } from '@/components/ScratchCard';

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
        <Pressable style={styles.secondary} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.secondaryText}>목록으로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '뽑기 결과', headerBackVisible: false }} />
      <ScratchCard result={result} onRevealed={() => setRevealed(true)} />
      {revealed && result === 'win' && (
        <View style={styles.actions}>
          <Text style={styles.winTitle}>🎉 당첨!</Text>
          <Pressable
            style={styles.primary}
            onPress={() => router.replace(`/gifticon/${id}` as never)}>
            <Text style={styles.primaryText}>바코드 보기</Text>
          </Pressable>
        </View>
      )}
      {revealed && result === 'miss' && (
        <View style={styles.actions}>
          <Text style={styles.missTitle}>아쉽네요, 꽝이에요</Text>
          <Pressable
            style={styles.primary}
            onPress={() => router.replace({ pathname: '/listing/[id]', params: { id: listing_id } })}>
            <Text style={styles.primaryText}>같은 기프티콘 다시 뽑기</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.secondaryText}>목록으로</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa', padding: 16, gap: 16 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#fafafa',
  },
  muted: { color: '#888', fontSize: 15 },
  actions: { gap: 8 },
  winTitle: { fontSize: 28, fontWeight: '800', color: '#e8531f', textAlign: 'center' },
  missTitle: { fontSize: 20, fontWeight: '700', color: '#444', textAlign: 'center' },
  primary: { backgroundColor: '#e8531f', borderRadius: 8, padding: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryText: { color: '#444', fontSize: 16, fontWeight: '600' },
});
