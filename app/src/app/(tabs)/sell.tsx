import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StatusBadge, listingBadge } from '@/components/StatusBadge';
import { ApiError, fetchMyListings, messageFor, withdrawListing, type MyListing } from '@/lib/api';
import { formatPoints } from '@/lib/format';

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

  const header = (
    <Pressable style={styles.newBtn} onPress={() => router.push('/sell/new')}>
      <Text style={styles.newBtnText}>+ 새 기프티콘 올리기</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loading} color="#e8531f" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.container}>
        {header}
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => {
          const b = listingBadge(item);
          return (
            <Pressable
              style={styles.row}
              disabled={item.status !== 'active'}
              onPress={() => confirmWithdraw(item)}>
              <View style={styles.mid}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={styles.meta}>
                  {`${item.probability}% · ${item.miss_count}번 꽝 · ${formatPoints(item.settled_net)} 정산됨`}
                </Text>
              </View>
              <StatusBadge label={b.label} tone={b.tone} />
            </Pressable>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>아직 올린 기프티콘이 없어요</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  loading: { marginTop: 40 },
  newBtn: {
    margin: 12,
    backgroundColor: '#e8531f',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retry: { backgroundColor: '#e8531f', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#888', fontSize: 15, marginTop: 40 },
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
  name: { fontSize: 16, fontWeight: '700', color: '#222' },
  meta: { fontSize: 12, color: '#888' },
});
