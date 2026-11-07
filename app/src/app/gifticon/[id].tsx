import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge, settlementBadge } from '@/components/StatusBadge';
import { ApiError, fetchWinDetail, messageFor, settle, signedImageUrl } from '@/lib/api';

type Detail = Awaited<ReturnType<typeof fetchWinDetail>>;

export default function GifticonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  if (loading) return <ActivityIndicator style={styles.loading} color="#e8531f" />;
  if (error || !detail) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.muted}>기프티콘을 불러오지 못했어요</Text>
        <Pressable
          style={styles.retry}
          onPress={() => {
            setLoading(true);
            load();
          }}>
          <Text style={styles.primaryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  const { listing, secret, settlement } = detail;
  const badge = settlementBadge(settlement.status);

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
      <Text style={styles.meta}>{`유효기간 ${listing.expires_on}`}</Text>
      {settlement.status === 'held' ? (
        <>
          <Text style={styles.notice}>
            매장에서 사용한 뒤 아래 버튼을 눌러 주세요. 3일 안에 응답이 없으면 정상 사용으로 처리됩니다.
          </Text>
          <Pressable
            style={[styles.primary, busy && styles.disabled]}
            disabled={busy}
            onPress={() => run('confirm')}>
            <Text style={styles.primaryText}>정상 사용했어요</Text>
          </Pressable>
          <Pressable style={[styles.danger, busy && styles.disabled]} disabled={busy} onPress={onReport}>
            <Text style={styles.dangerText}>이미 쓰인 바코드예요</Text>
          </Pressable>
        </>
      ) : (
        <StatusBadge label={badge.label} tone={badge.tone} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#fafafa' },
  loading: { marginTop: 40 },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retry: { backgroundColor: '#e8531f', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  muted: { color: '#888', fontSize: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#e8531f' },
  name: { fontSize: 17, fontWeight: '600', color: '#222' },
  imageBox: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#fff', borderRadius: 8 },
  imageFail: { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  barcode: {
    fontFamily: 'monospace',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#222',
  },
  meta: { color: '#666', fontSize: 14 },
  notice: { color: '#444', fontSize: 14, lineHeight: 20 },
  primary: { backgroundColor: '#e8531f', borderRadius: 8, padding: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  danger: {
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dangerText: { color: '#c0392b', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
