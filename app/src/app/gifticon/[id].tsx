import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge, settlementBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useRules } from '@/hooks/useRules';
import { ApiError, fetchWinDetail, messageFor, settle, signedImageUrl } from '@/lib/api';
import { colors, radius, space, type } from '@/lib/theme';

type Detail = Awaited<ReturnType<typeof fetchWinDetail>>;

export default function GifticonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { holdDays } = useRules();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchWinDetail(id);
      setDetail(d);
      setError(false);
      try {
        setImageUrl(await signedImageUrl(d.secret.image_path));
        setImageFailed(false);
      } catch {
        setImageFailed(true);
      }
    } catch (e) {
      console.warn('win detail failed', (e as Error).message);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: 'confirm' | 'report') {
    if (busy) return;
    setBusy(true);
    try {
      const { status } = await settle(id, action);
      setDetail((d) => (d ? { ...d, settlement: { ...d.settlement, status } } : d));
      Alert.alert(action === 'confirm' ? '확인했어요' : '신고가 접수됐어요');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'INTERNAL';
      Alert.alert(messageFor(code));
      if (code === 'SETTLEMENT_NOT_HELD') await load();
    } finally {
      setBusy(false);
    }
  }

  function onReport() {
    Alert.alert('이미 쓰인 바코드인가요?', '신고하면 판매자 정산이 보류되고 확인 절차가 진행돼요.', [
      { text: '취소', style: 'cancel' },
      { text: '신고하기', style: 'destructive', onPress: () => run('report') },
    ]);
  }

  if (loading) return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  if (error || !detail) {
    return (
      <View style={styles.errorBox}>
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

  const { listing, secret, settlement } = detail;
  const badge = settlementBadge(settlement.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{`🎉 ${listing.brand}`}</Text>
      <Text style={styles.name}>{listing.product_name}</Text>
      {/* 가로 꽉 채운 4:3 상자 안에서 contain으로 원본 비율을 유지한다 */}
      {imageFailed || !imageUrl ? (
        <View style={[styles.imageBox, styles.imageFail]}>
          <Text style={styles.muted}>이미지를 불러오지 못했어요</Text>
        </View>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={styles.imageBox}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      )}
      {secret.barcode_number ? <Text style={styles.barcode}>{secret.barcode_number}</Text> : null}
      <Text style={styles.meta}>{`유효기간 ${listing.expires_on.replace(/-/g, '.')}`}</Text>
      {settlement.status === 'held' ? (
        <>
          <Text style={styles.notice}>
            {`매장에서 사용한 뒤 아래 버튼을 눌러 주세요. ${holdDays}일 안에 응답이 없으면 정상 사용으로 처리됩니다.`}
          </Text>
          <Button title="정상 사용했어요" busy={busy} onPress={() => run('confirm')} />
          <Button variant="danger" title="이미 쓰인 바코드예요" disabled={busy} onPress={onReport} />
        </>
      ) : (
        <StatusBadge label={badge.label} tone={badge.tone} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  container: { padding: space.screen, gap: space.gap },
  loading: { marginTop: 40 },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: colors.bg,
  },
  muted: { color: colors.sub, fontSize: 15 },
  title: { ...type.screenTitle, color: colors.ink },
  name: { ...type.rowTitle, color: colors.sub },
  imageBox: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.bg2, borderRadius: radius.md },
  imageFail: { alignItems: 'center', justifyContent: 'center' },
  barcode: {
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.ink,
  },
  meta: type.meta,
  notice: { ...type.body, color: colors.ink, lineHeight: 20 },
});
