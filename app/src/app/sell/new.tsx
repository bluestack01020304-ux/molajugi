import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ListingForm, type ListingFormValues } from '@/components/ListingForm';
import { useRules } from '@/hooks/useRules';
import { ApiError, createListing, messageFor } from '@/lib/api';
import { showMessage } from '@/lib/dialog';

export default function NewListingScreen() {
  const router = useRouter();
  const rules = useRules();
  const [busy, setBusy] = useState(false);

  // 사진 두 장은 폼이 고르는 즉시 올려 두므로, 여기서는 올린 경로만 받아 매물을 만든다.
  async function submit({ image_path, preview_path, ...fields }: ListingFormValues) {
    if (busy || !image_path || !preview_path) return;
    setBusy(true);
    try {
      await createListing({ ...fields, image_path, preview_path });
      showMessage('올렸어요');
      router.back();
    } catch (e) {
      showMessage(messageFor(e instanceof ApiError ? e.code : 'INTERNAL', rules));
    } finally {
      setBusy(false);
    }
  }

  return <ListingForm submitLabel="올리기" busy={busy} onSubmit={submit} />;
}
