import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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
import { Button } from '@/components/ui/Button';
import { useRules } from '@/hooks/useRules';
import { ApiError, createListing, messageFor, uploadGifticonImage } from '@/lib/api';
import type { Category, Probability } from '@/lib/database.types';
import { formatWon, previewPrice } from '@/lib/format';
import { previewNet } from '@/lib/rules';
import { colors, radius, space, type } from '@/lib/theme';

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// 폰의 로컬 날짜를 YYYY-MM-DD로. 서버는 KST 기준이고 폰도 한국이라는 전제.
function toYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function NewListingScreen() {
  const router = useRouter();
  const rules = useRules();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('cafe');
  const [brand, setBrand] = useState('');
  const [productName, setProductName] = useState('');
  const [faceText, setFaceText] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [probability, setProbability] = useState<Probability | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 서버 규칙(min_days_to_list)보다 가까운 날짜는 고를 수 없게 한다.
  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + rules.minDaysToList);
    return d;
  }, [rules.minDaysToList]);

  function openDatePicker() {
    const value = isRealDate(expiresOn) ? fromYmd(expiresOn) : minDate;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate: minDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) setExpiresOn(toYmd(date));
        },
      });
    } else {
      setShowDatePicker(true);
    }
  }

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
      Alert.alert(messageFor(e instanceof ApiError ? e.code : 'INTERNAL', rules));
    } finally {
      setBusy(false);
    }
  }

  const price = probability !== null && face > 0 ? previewPrice(face, probability) : 0;
  // app_config 수수료율로 한 표시 전용 계산. 실제 정산액은 서버가 정한다.
  const net = previewNet(price, rules.feeRate);

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
        <Pressable style={styles.input} onPress={openDatePicker}>
          <Text style={expiresOn ? styles.inputText : styles.placeholder}>
            {expiresOn || '날짜 선택'}
          </Text>
        </Pressable>
        {showDatePicker && Platform.OS !== 'android' && (
          <View style={styles.pickerBox}>
            <DateTimePicker
              value={isRealDate(expiresOn) ? fromYmd(expiresOn) : minDate}
              mode="date"
              display="spinner"
              minimumDate={minDate}
              locale="ko-KR"
              onChange={(_event, date) => {
                if (date) setExpiresOn(toYmd(date));
              }}
            />
            <Pressable style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.pickerDoneText}>완료</Text>
            </Pressable>
          </View>
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
        <Button title="올리기" disabled={!valid} busy={busy} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.screen, gap: 8 },
  imageBox: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageHint: { color: colors.sub, fontSize: 15 },
  label: { ...type.label, marginTop: 8 },
  chipsWrap: { marginHorizontal: -space.screen },
  input: {
    borderRadius: radius.sm,
    backgroundColor: colors.bg2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  inputText: { fontSize: 16, color: colors.ink },
  placeholder: { fontSize: 16, color: colors.faint },
  pickerBox: {
    borderRadius: radius.sm,
    backgroundColor: colors.bg2,
    marginTop: 6,
    alignItems: 'center',
  },
  pickerDone: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10 },
  pickerDoneText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  warn: { color: colors.danger, fontSize: 12 },
  explain: { ...type.body, marginTop: 8, color: colors.ink },
  footer: {
    padding: space.screen,
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
