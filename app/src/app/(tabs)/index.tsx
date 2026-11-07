import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

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

  const load = useCallback(async () => {
    try {
      setItems(await fetchActiveListings(category));
    } catch (e) {
      console.warn('listings fetch failed', (e as Error).message);
    } finally {
      setLoading(false);
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
  empty: { textAlign: 'center', color: '#888', fontSize: 15 },
});
