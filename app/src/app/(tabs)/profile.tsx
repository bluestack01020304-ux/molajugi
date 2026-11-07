import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, space, type } from '@/lib/theme';
import {
  ApiError,
  fetchNotifications,
  markAllRead,
  messageFor,
  savePushToken,
  topup,
} from '@/lib/api';
import type { Notification } from '@/lib/database.types';
import { formatPoints } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useRules } from '@/hooks/useRules';
import { useRefreshUnread } from '@/hooks/useUnreadCount';
import { useWallet } from '@/hooks/useWallet';

/** UTC 시각 문자열을 KST 'MM.DD HH:mm'으로. */
function formatTime(iso: string | null): string {
  if (!iso) return '';
  const k = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString();
  return `${k.slice(5, 7)}.${k.slice(8, 10)} ${k.slice(11, 16)}`;
}

async function registerPushToken() {
  try {
    if (!Device.isDevice) return;
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await savePushToken(t.data);
  } catch {
    // 푸시는 부가 기능: 실패(Android Expo Go 등)는 조용히 무시
  }
}

export default function ProfileScreen() {
  const { balance, refresh } = useWallet();
  const { topupAmount } = useRules();
  const refreshUnread = useRefreshUnread();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    void registerPushToken();
  }, []);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    try {
      // 먼저 읽음 처리하고 뱃지를 갱신한 뒤 목록을 가져온다.
      await markAllRead();
      await refreshUnread();
      const data = await fetchNotifications();
      if (mine !== requestId.current) return;
      setItems(data);
      setError(false);
    } catch (e) {
      if (mine !== requestId.current) return;
      console.warn('notifications failed', (e as Error).message);
      setError(true);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onTopup() {
    if (busy) return;
    setBusy(true);
    try {
      await topup();
      await refresh();
    } catch (e) {
      Alert.alert(messageFor(e instanceof ApiError ? e.code : 'INTERNAL'));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.balanceLabel}>내 포인트</Text>
      <Text style={styles.balance}>{formatPoints(balance)}</Text>
      <View style={styles.btnRow}>
        <Button
          style={styles.btn}
          title={`충전 (테스트 +${formatPoints(topupAmount)})`}
          busy={busy}
          onPress={onTopup}
        />
        <Button style={styles.btn} title="출금 (준비중)" disabled />
      </View>
      <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>
      <Text style={styles.section}>알림함</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <Text style={styles.empty}>{error ? '알림을 불러오지 못했어요' : '아직 알림이 없어요'}</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.bg, padding: space.screen, gap: 10 },
  balanceLabel: type.label,
  balance: { fontSize: 36, fontWeight: '800', color: colors.ink },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingHorizontal: 8 },
  logout: { alignSelf: 'flex-start', paddingVertical: 6 },
  logoutText: { color: colors.sub, fontSize: 14, textDecorationLine: 'underline' },
  section: { ...type.headerTitle, marginTop: 8, color: colors.ink },
  empty: { textAlign: 'center', color: colors.sub, fontSize: 15, marginTop: 30 },
  row: {
    paddingHorizontal: space.screen,
    paddingVertical: 12,
    gap: 2,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { ...type.rowTitle, fontWeight: '700', color: colors.ink },
  body: { ...type.body, color: colors.ink },
  time: type.meta,
});
