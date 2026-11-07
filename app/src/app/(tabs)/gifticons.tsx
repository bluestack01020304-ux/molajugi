import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StatusBadge, settlementBadge } from '@/components/StatusBadge';
import { fetchMyWins, type Win } from '@/lib/api';

export default function GifticonsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    try {
      const data = await fetchMyWins();
      if (mine !== requestId.current) return;
      setItems(data);
      setError(false);
    } catch (e) {
      if (mine !== requestId.current) return;
      console.warn('wins fetch failed', (e as Error).message);
      setItems([]);
      setError(true);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loading} color="#e8531f" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.container, styles.errorBox]}>
        <Text style={styles.empty}>목록을 불러오지 못했어요</Text>
        <Pressable
          style={styles.retry}
          onPress={() => {
            setLoading(true);
            load();
          }}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(w) => w.draw.id}
        renderItem={({ item }) => {
          const b = settlementBadge(item.settlement.status);
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/gifticon/[id]', params: { id: item.draw.id } })}>
              <View style={styles.mid}>
                <Text style={styles.brand} numberOfLines={1}>
                  {item.listing.brand}
                </Text>
                <Text style={styles.name} numberOfLines={1}>
                  {item.listing.product_name}
                </Text>
                <Text style={styles.meta}>{`유효기간 ${item.listing.expires_on}`}</Text>
              </View>
              <StatusBadge label={b.label} tone={b.tone} />
            </Pressable>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>아직 당첨된 기프티콘이 없어요</Text>}
        contentContainerStyle={items.length === 0 && styles.emptyContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  loading: { marginTop: 40 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  errorBox: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  retry: { backgroundColor: '#e8531f', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#888', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  mid: { flex: 1, gap: 2 },
  brand: { fontSize: 12, color: '#888' },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  meta: { fontSize: 12, color: '#888' },
});
