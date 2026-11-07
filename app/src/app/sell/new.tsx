import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CategoryChips } from '@/components/CategoryChips';
import { PresetPicker } from '@/components/PresetPicker';
import { ApiError, createListing, messageFor, uploadGifticonImage } from '@/lib/api';
import type { Category, Probability } from '@/lib/database.types';
import { formatWon, previewPrice } from '@/lib/format';

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export default function NewListingScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('cafe');
  const [brand, setBrand] = useState('');
  const [productName, setProductName] = useState('');
  const [faceText, setFaceText] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [probability, setProbability] = useState<Probability | null>(null);
  const [busy, setBusy] = useState(false);

  const face = faceText ? Number(faceText) : 0;
  const valid =
    !!imageUri &&
    brand.trim().length > 0 &&
    productName.trim().length > 0 &&
    face > 0 &&
    isRealDate(expiresOn) &&
    probability !== null;

  async function pickImage() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
    } catch (e) {
      console.warn('image pick failed', (e as Error).message);
      Alert.alert('사진을 불러오지 못했어요');
    }
  }

  async function submit() {
    if (!valid || busy || probability === null || !imageUri) return;
    setBusy(true);
    try {
      const image_path = await uploadGifticonImage(imageUri);
      await createListing({
        category,
        brand: brand.trim(),
        product_name: productName.trim(),
        face_value: face,
        expires_on: expiresOn,
        probability,
        image_path,
        barcode_number: barcode.trim() || undefined,
      });
      Alert.alert('올렸어요');
      router.back();
    } catch (e) {
      Alert.alert(messageFor(e instanceof ApiError ? e.code : 'INTERNAL'));
    } finally {
      setBusy(false);
    }
  }

  const price = probability !== null && face > 0 ? previewPrice(face, probability) : 0;
  // 서버 수수료(10%)를 따라 한 표시 전용 계산. 실제 정산액은 서버가 정한다.
  const net = price - Math.round(price * 0.1);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Pressable style={styles.imageBox} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.imageHint}>기프티콘 사진 고르기</Text>
          )}
        </Pressable>

        <Text style={styles.label}>카테고리</Text>
        <View style={styles.chipsWrap}>
          <CategoryChips
            includeAll={false}
            value={category}
            onChange={(v) => v !== 'all' && setCategory(v)}
          />
        </View>

        <Text style={styles.label}>브랜드</Text>
        <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="예) 스타벅스" />

        <Text style={styles.label}>상품명</Text>
        <TextInput
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
          placeholder="예) 아메리카노 T"
        />

        <Text style={styles.label}>액면가</Text>
        <TextInput
          style={styles.input}
          value={faceText}
          onChangeText={(t) => setFaceText(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="예) 4500"
        />

        <Text style={styles.label}>유효기간</Text>
        <TextInput
          style={styles.input}
          value={expiresOn}
          onChangeText={setExpiresOn}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        {expiresOn.length > 0 && !isRealDate(expiresOn) && (
          <Text style={styles.warn}>YYYY-MM-DD 형식으로 입력해 주세요</Text>
        )}

        <Text style={styles.label}>바코드 번호 (선택)</Text>
        <TextInput style={styles.input} value={barcode} onChangeText={setBarcode} autoCapitalize="none" />

        <Text style={styles.label}>당첨 확률</Text>
        <PresetPicker faceValue={face} value={probability} onChange={setProbability} />

        {probability !== null && face > 0 && (
          <Text style={styles.explain}>
            {`꽝이 날 때마다 ${formatWon(net)}이 들어오고, 당첨되면 기프티콘이 넘어갑니다`}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submit, (!valid || busy) && styles.submitDisabled]}
          disabled={!valid || busy}
          onPress={submit}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>올리기</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, gap: 8 },
  imageBox: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageHint: { color: '#888', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 8 },
  chipsWrap: { marginHorizontal: -16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  warn: { color: '#c0392b', fontSize: 12 },
  explain: { marginTop: 8, fontSize: 14, color: '#444' },
  footer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  submit: { backgroundColor: '#e8531f', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitDisabled: { backgroundColor: '#ccc' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
