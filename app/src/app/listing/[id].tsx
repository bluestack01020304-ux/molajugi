import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { DetailBottomBar } from '@/components/DetailBottomBar';
import { useWallet } from '@/hooks/useWallet';
import { ApiError, draw, fetchListing, messageFor } from '@/lib/api';
import type { Listing } from '@/lib/database.types';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  MIN_DRAWABLE_DAYS,
  asCategory,
  daysLeft,
  daysLeftLabel,
  formatWon,
} from '@/lib/format';
import { colors, radius, space, type } from '@/lib/theme';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { balance, refresh } = useWallet();
  const [listing, setListing] = useState<Listing | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchListing(id)
      .then((l) => active && setListing(l))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id]);

  const onDraw = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await draw(id);
      await refresh();
      router.replace({
        pathname: '/draw/[id]',
        params: { id: r.draw_id, result: r.result, listing_id: id },
      });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'INTERNAL';
      Alert.alert('뽑기 실패', messageFor(code));
      if (code === 'LISTING_NOT_ACTIVE') {
        fetchListing(id).then(setListing).catch(() => {});
      }
      setBusy(false);
    }
  };

  if (!listing) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        {failed ? (
          <Text style={styles.muted}>기프티콘을 찾을 수 없어요</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  const category = asCategory(listing.category);
  const undrawable = listing.status !== 'active' || daysLeft(listing.expires_on) < MIN_DRAWABLE_DAYS;
  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: '액면가', value: formatWon(listing.face_value) },
    { label: '당첨 확률', value: `${listing.probability}%`, accent: true },
    { label: '지금까지 꽝', value: `${listing.miss_count}번` },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: listing.brand }} />
      <View style={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{CATEGORY_EMOJI[category]}</Text>
        </View>
        <Text style={styles.name}>{listing.product_name}</Text>
        <Text style={styles.subline}>
          {`${CATEGORY_LABELS[category]} · 유효기간 ${listing.expires_on.replace(/-/g, '.')} (${daysLeftLabel(listing.expires_on)})`}
        </Text>
        <View style={styles.table}>
          {rows.map((r) => (
            <View key={r.label} style={styles.tr}>
              <Text style={styles.th}>{r.label}</Text>
              <Text style={[styles.td, r.accent && styles.accent]}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>
      <DetailBottomBar
        price={listing.price}
        faceValue={listing.face_value}
        balance={balance}
        undrawable={undrawable}
        busy={busy}
        onDraw={onDraw}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  muted: { color: colors.sub, fontSize: 15 },
  body: { flex: 1, paddingHorizontal: space.screen, paddingTop: space.screen },
  hero: {
    height: 160,
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 56 },
  name: { ...type.screenTitle, color: colors.ink, marginTop: 14 },
  subline: { ...type.meta, marginTop: 4 },
  table: { marginTop: 14 },
  tr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  th: { fontSize: 14, color: colors.sub },
  td: { fontSize: 14, color: colors.ink },
  accent: { color: colors.primary, fontWeight: '800' },
});
