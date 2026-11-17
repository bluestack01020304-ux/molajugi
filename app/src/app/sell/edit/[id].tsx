import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ListingForm, type ListingFormValues } from '@/components/ListingForm';
import { useRules } from '@/hooks/useRules';
import { ApiError, fetchMyListing, messageFor, signedImageUrl, updateListing } from '@/lib/api';
import type { Probability } from '@/lib/database.types';
import { showMessage } from '@/lib/dialog';
import { asCategory } from '@/lib/format';
import { previewUrl } from '@/lib/preview';
import { colors } from '@/lib/theme';

type Loaded = Awaited<ReturnType<typeof fetchMyListing>> & { imageUrl: string | null };

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rules = useRules();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await fetchMyListing(id);
        // 사진 주소를 못 받아도 나머지 정보는 고칠 수 있게 한다.
        const imageUrl = d.secret ? await signedImageUrl(d.secret.image_path).catch(() => null) : null;
        if (active) setData({ ...d, imageUrl });
      } catch (e) {
        console.warn('my listing fetch failed', (e as Error).message);
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // 사진은 폼이 고르는 즉시 올려 둔다. 바꾸지 않은 사진의 경로는 undefined로 와서 기존 사진이 유지된다.
  async function submit(values: ListingFormValues) {
    if (busy) return;
    setBusy(true);
    try {
      await updateListing({ id, ...values });
      showMessage('수정했어요');
      router.back();
    } catch (e) {
      showMessage(messageFor(e instanceof ApiError ? e.code : 'INTERNAL', rules));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <View style={styles.center}>
        {failed ? (
          <Text style={styles.muted}>기프티콘을 불러오지 못했어요</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }
  const { listing, secret, imageUrl } = data;
  if (listing.status !== 'active') {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>판매중인 기프티콘만 수정할 수 있어요</Text>
      </View>
    );
  }

  return (
    <ListingForm
      initial={{
        category: asCategory(listing.category),
        brand: listing.brand,
        product_name: listing.product_name,
        face_value: listing.face_value,
        expires_on: listing.expires_on,
        probability: listing.probability as Probability,
        barcode_number: secret?.barcode_number ?? '',
      }}
      existingImageUrl={imageUrl}
      existingPreviewUrl={previewUrl(listing.preview_path)}
      termsLocked={listing.miss_count > 0}
      submitLabel="수정 완료"
      busy={busy}
      onSubmit={submit}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.bg,
  },
  muted: { color: colors.sub, fontSize: 15, textAlign: 'center' },
});
