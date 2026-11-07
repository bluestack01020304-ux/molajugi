import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { CategoryChips } from '@/components/CategoryChips';
import { ListingRow } from '@/components/ListingRow';
import { fetchActiveListings } from '@/lib/api';
import type { Category, Listing } from '@/lib/database.types';

export default function HomeScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    try {
      const data = await fetchActiveListings(category);
      if (mine !== requestId.current) return;
      setItems(data);
      setError(false);
    } catch (e) {
      if (mine !== requestId.current) return;
      console.warn('listings fetch failed', (e as Error).message);
      setItems([]);
      setError(true);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [category]);

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

  return (
    <View style={styles.container}>
      <CategoryChips
        value={category}
        onChange={(c) => {
          setLoading(true);
          setCategory(c);
        }}
      />
      {loading ? (
        <ActivityIndicator style={styles.loading} color="#e8531f" />
      ) : error ? (
        <View style={styles.errorBox}>
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
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <ListingRow listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>아직 올라온 기프티콘이 없어요</Text>}
          contentContainerStyle={items.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  loading: { marginTop: 40 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retry: { backgroundColor: '#e8531f', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#888', fontSize: 15 },
});
