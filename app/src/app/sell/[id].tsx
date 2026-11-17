import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge, listingBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ApiError, fetchMyListing, messageFor, signedImageUrl, withdrawListing } from '@/lib/api';
import { confirmAction, showMessage } from '@/lib/dialog';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  asCategory,
  daysLeftLabel,
  formatPoints,
  formatWon,
} from '@/lib/format';
import { previewUrl } from '@/lib/preview';
import { colors, radius, space, type } from '@/lib/theme';

type Detail = Awaited<ReturnType<typeof fetchMyListing>>;

/** 판매 탭에서 내 매물을 눌렀을 때 보는 상세. 판매중이면 여기서 수정하거나 내린다. */
export default function MyListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    try {
      const d = await fetchMyListing(id);
      // 사진은 못 불러와도 나머지 정보는 보여 준다.
      const url = d.secret ? await signedImageUrl(d.secret.image_path).catch(() => null) : null;
      if (mine !== requestId.current) return;
      setDetail(d);
      setImageUrl(url);
      setError(false);
    } catch (e) {
      if (mine !== requestId.current) return;
      console.warn('my listing fetch failed', (e as Error).message);
      setError(true);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [id]);

  // 수정 화면에서 돌아왔을 때 바뀐 내용이 바로 보이도록 화면에 들어올 때마다 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function onWithdraw() {
    if (!detail) return;
    confirmAction({
      title: '내릴까요?',
      message: '내린 기프티콘은 다시 올릴 수 없어요. 필요하면 새로 올려 주세요.',
      confirmText: '내리기',
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          await withdrawListing(id);
        } catch (e) {
          showMessage(messageFor(e instanceof ApiError ? e.code : 'INTERNAL'));
        }
        await load();
        setBusy(false);
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error || !detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>기프티콘을 불러오지 못했어요</Text>
        <Button
          variant="soft"
          title="다시 시도"
          onPress={() => {
            setLoading(true);
            load();
          }}
        />
      </View>
    );
  }

  const { listing, secret } = detail;
  const category = asCategory(listing.category);
  const badge = listingBadge(listing);
  const preview = previewUrl(listing.preview_path);
  const active = listing.status === 'active';
  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: '카테고리', value: CATEGORY_LABELS[category] },
    { label: '액면가', value: formatWon(listing.face_value) },
    { label: '뽑기 가격', value: formatWon(listing.price) },
    { label: '당첨 확률', value: `${listing.probability}%`, accent: true },
    {
      label: '유효기간',
      value: `${listing.expires_on.replace(/-/g, '.')} (${daysLeftLabel(listing.expires_on)})`,
    },
    { label: '지금까지 꽝', value: `${listing.miss_count}번` },
    { label: '정산된 금액', value: formatPoints(listing.settled_net) },
  ];
  if (secret?.barcode_number) rows.push({ label: '바코드 번호', value: secret.barcode_number });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: listing.brand }} />
      <ScrollView contentContainerStyle={styles.body}>
        {preview && imageUrl ? (
          <View style={styles.photos}>
            <View style={styles.photoCol}>
              <Image source={{ uri: preview }} style={styles.photo} resizeMode="contain" />
              <Text style={styles.photoLabel}>보여주는 사진 · 모두에게 보여요</Text>
            </View>
            <View style={styles.photoCol}>
              <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="contain" />
              <Text style={styles.photoLabel}>원본 사진 · 당첨자만 봐요</Text>
            </View>
          </View>
        ) : imageUrl || preview ? (
          <Image source={{ uri: (imageUrl ?? preview)! }} style={styles.hero} resizeMode="contain" />
        ) : (
          <View style={[styles.hero, styles.heroEmpty]}>
            <Text style={styles.heroEmoji}>{CATEGORY_EMOJI[category]}</Text>
            {!secret && (
              <Text style={styles.muted}>당첨자에게 넘어간 기프티콘은 사진을 볼 수 없어요</Text>
            )}
          </View>
        )}
        <View style={styles.head}>
          <Text style={styles.name}>{listing.product_name}</Text>
          <StatusBadge label={badge.label} tone={badge.tone} />
        </View>
        <View style={styles.table}>
          {rows.map((r) => (
            <View key={r.label} style={styles.tr}>
              <Text style={styles.th}>{r.label}</Text>
              <Text style={[styles.td, r.accent && styles.accent]}>{r.value}</Text>
            </View>
          ))}
        </View>
        {active && listing.miss_count > 0 && (
          <Text style={styles.note}>
            이미 뽑은 사람이 있어서 액면가·유효기간·당첨 확률은 바꿀 수 없어요
          </Text>
        )}
      </ScrollView>
      {active && (
        <View style={styles.footer}>
          <Button
            variant="danger"
            title="내리기"
            disabled={busy}
            onPress={onWithdraw}
            style={styles.footerBtn}
          />
          <Button
            title="수정하기"
            disabled={busy}
            onPress={() => router.push({ pathname: '/sell/edit/[id]', params: { id } })}
            style={styles.footerBtn}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: colors.bg,
  },
  muted: { color: colors.sub, fontSize: 13, textAlign: 'center' },
  body: { padding: space.screen },
  hero: { width: '100%', height: 200, backgroundColor: colors.bg2, borderRadius: radius.md },
  photos: { flexDirection: 'row', gap: space.gap },
  photoCol: { flex: 1, gap: 6 },
  photo: { width: '100%', height: 180, backgroundColor: colors.bg2, borderRadius: radius.md },
  photoLabel: { ...type.meta, textAlign: 'center' },
  heroEmpty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  heroEmoji: { fontSize: 56 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.gap, marginTop: 14 },
  name: { ...type.screenTitle, color: colors.ink, flexShrink: 1 },
  table: { marginTop: 14 },
  tr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.gap,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  th: { fontSize: 14, color: colors.sub },
  td: { fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  accent: { color: colors.primary, fontWeight: '800' },
  note: { ...type.meta, marginTop: 12 },
  footer: {
    flexDirection: 'row',
    gap: space.gap,
    padding: space.screen,
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerBtn: { flex: 1 },
});
