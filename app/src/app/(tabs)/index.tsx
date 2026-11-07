import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { CategoryChips } from '@/components/CategoryChips';
import { ListingRow } from '@/components/ListingRow';
import { Button } from '@/components/ui/Button';
import { Fab } from '@/components/ui/Fab';
import { fetchActiveListings } from '@/lib/api';
import type { Category, Listing } from '@/lib/database.types';
import { colors, type } from '@/lib/theme';

const FAB_CLEARANCE = 96;

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
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.empty}>목록을 불러오지 못했어요</Text>
          <Button
            variant="soft"
            title="다시 시도"
            onPress={() => {
              setLoading(true);
              load();
            }}
          />
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
          contentContainerStyle={[styles.listContent, items.length === 0 && styles.emptyContainer]}
        />
      )}
      <Fab onPress={() => router.push('/sell/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { marginTop: 40 },
  listContent: { paddingBottom: FAB_CLEARANCE },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  empty: { ...type.body, textAlign: 'center', color: colors.sub, fontSize: 15 },
});
