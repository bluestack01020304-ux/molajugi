import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StatusBadge, listingBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Fab } from '@/components/ui/Fab';
import { Thumb } from '@/components/ui/Thumb';
import { ApiError, fetchMyListings, messageFor, withdrawListing, type MyListing } from '@/lib/api';
import { formatPoints } from '@/lib/format';
import { colors, space, type } from '@/lib/theme';

const FAB_CLEARANCE = 96;

export default function SellScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    try {
      const data = await fetchMyListings();
      if (mine !== requestId.current) return;
      setItems(data);
      setError(false);
    } catch (e) {
      if (mine !== requestId.current) return;
      console.warn('my listings fetch failed', (e as Error).message);
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

  function confirmWithdraw(item: MyListing) {
    Alert.alert('내릴까요?', item.product_name, [
      { text: '취소', style: 'cancel' },
      {
        text: '내리기',
        style: 'destructive',
        onPress: async () => {
          try {
            await withdrawListing(item.id);
          } catch (e) {
            Alert.alert(messageFor(e instanceof ApiError ? e.code : 'INTERNAL'));
          }
          load();
        },
      },
    ]);
  }

  const fab = <Fab onPress={() => router.push('/sell/new')} />;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
        {fab}
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.container}>
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
        {fab}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => {
          const b = listingBadge(item);
          return (
            <Pressable
              style={styles.row}
              disabled={item.status !== 'active'}
              onPress={() => confirmWithdraw(item)}>
              <Thumb category={item.category} size={52} />
              <View style={styles.mid}>
                <Text style={styles.title} numberOfLines={1}>
                  {`${item.brand} ${item.product_name}`}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {`${item.probability}% · ${item.miss_count}번 꽝 · ${formatPoints(item.settled_net)} 정산됨`}
                </Text>
              </View>
              <StatusBadge label={b.label} tone={b.tone} />
            </Pressable>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>아직 올린 기프티콘이 없어요</Text>}
        contentContainerStyle={[styles.listContent, items.length === 0 && styles.emptyContainer]}
      />
      {fab}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { marginTop: 40 },
  listContent: { paddingBottom: FAB_CLEARANCE },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  empty: { textAlign: 'center', color: colors.sub, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingVertical: 12,
    gap: space.gap,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mid: { flex: 1, minWidth: 0, gap: 3 },
  title: { ...type.rowTitle, color: colors.ink },
  meta: type.meta,
});
