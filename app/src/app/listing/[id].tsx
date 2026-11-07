import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useWallet } from '@/hooks/useWallet';
import { fetchListing } from '@/lib/api';
import type { Listing } from '@/lib/database.types';
import {
  CATEGORY_EMOJI,
  asCategory,
  daysLeft,
  daysLeftLabel, formatPoints,
  formatWon,
} from '@/lib/format';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { balance } = useWallet();
  const [listing, setListing] = useState<Listing | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchListing(id)
      .then((l) => active && setListing(l))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id]);

  if (!listing) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        {failed ? (
          <Text style={styles.muted}>기프티콘을 찾을 수 없어요</Text>
        ) : (
          <ActivityIndicator color="#e8531f" />
        )}
      </View>
    );
  }

  const undrawable = listing.status !== 'active' || daysLeft(listing.expires_on) <= 1;
  const insufficient = balance < listing.price;
  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: '액면가', value: formatWon(listing.face_value) },
    { label: '당첨 확률', value: `${listing.probability}%`, accent: true },
    { label: '유효기간', value: `${listing.expires_on} (${daysLeftLabel(listing.expires_on)})` },
    { label: '지금까지 꽝', value: `${listing.miss_count}번` },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: listing.brand }} />
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>{CATEGORY_EMOJI[asCategory(listing.category)]}</Text>
      </View>
      <Text style={styles.name}>{listing.product_name}</Text>
      <View style={styles.table}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.tr, i > 0 && styles.trBorder]}>
            <Text style={styles.th}>{r.label}</Text>
            <Text style={[styles.td, r.accent && styles.accent]}>{r.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.spacer} />
      <View style={styles.bottom}>
        {!undrawable && (
          <Text style={styles.points}>
            {`내 포인트 ${formatPoints(balance)} → ${formatPoints(balance - listing.price)}`}
          </Text>
        )}
        {!undrawable && insufficient && (
          <Text style={styles.warn}>포인트가 부족해요. 내 정보에서 충전하세요</Text>
        )}
        <Pressable
          style={[styles.button, (undrawable || insufficient) && styles.buttonDisabled]}
          disabled={undrawable || insufficient}
          onPress={() => {
            // TODO(Task 12): draw 호출
          }}>
          <Text style={styles.buttonText}>{undrawable
            ? '지금은 뽑을 수 없는 기프티콘이에요'
            : `${formatPoints(listing.price)}로 뽑기`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  muted: { color: '#888', fontSize: 15 },
  hero: { height: 160, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 72 },
  name: { fontSize: 22, fontWeight: '700', color: '#111', paddingHorizontal: 16, paddingTop: 16 },
  table: {
    margin: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
  },
  tr: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  trBorder: { borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  th: { fontSize: 15, color: '#666' },
  td: { fontSize: 15, color: '#111' },
  accent: { color: '#e8531f', fontWeight: '700' },
  spacer: { flex: 1 },
  bottom: {
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  points: { fontSize: 14, color: '#444', textAlign: 'center' },
  warn: { fontSize: 13, color: '#d33', textAlign: 'center' },
  button: { backgroundColor: '#e8531f', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
