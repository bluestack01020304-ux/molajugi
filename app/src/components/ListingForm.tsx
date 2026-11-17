import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { CropModal } from '@/components/CropModal';
import { PresetPicker } from '@/components/PresetPicker';
import { Button } from '@/components/ui/Button';
import { useRules } from '@/hooks/useRules';
import {
  ApiError,
  messageFor,
  readGifticon,
  uploadGifticonImage,
  uploadPreviewImage,
  type GifticonReading,
} from '@/lib/api';
import type { Category, Probability } from '@/lib/database.types';
import { showMessage } from '@/lib/dialog';
import { formatWon, previewPrice } from '@/lib/format';
import { previewNet } from '@/lib/rules';
import { colors, radius, space, type } from '@/lib/theme';

export type ListingFormValues = {
  /** 이번에 새로 올린 원본(전체) 사진의 경로. 바꾸지 않았으면 undefined. */
  image_path?: string;
  /** 이번에 새로 올린 보여주는 사진의 경로. 바꾸지 않았으면 undefined. */
  preview_path?: string;
  category: Category;
  brand: string;
  product_name: string;
  face_value: number;
  expires_on: string;
  probability: Probability;
  barcode_number?: string;
};

export type ListingFormInitial = Omit<ListingFormValues, 'image_path' | 'preview_path' | 'barcode_number'> & {
  barcode_number: string;
};

/** 사진 한 장의 상태: 화면에 보일 주소, 올리는 중인지, 올린 뒤의 경로. */
type Photo = { uri: string | null; uploading: boolean; path?: string };

// 원본 사진에서 정보를 읽어 오는 단계
type ReadState = 'idle' | 'reading' | 'filled' | 'barcodeOnly' | 'empty' | 'unavailable';

const READ_NOTE: Record<Exclude<ReadState, 'idle'>, string> = {
  reading: '사진에서 정보를 읽는 중이에요…',
  filled: '사진에서 읽은 정보를 채웠어요. 맞는지 꼭 확인해 주세요.',
  barcodeOnly: '바코드 번호를 읽어 채웠어요. 나머지는 직접 입력해 주세요.',
  empty: '사진에서 정보를 읽지 못했어요. 직접 입력해 주세요.',
  unavailable: '지금은 자동 입력을 쓸 수 없어요. 직접 입력해 주세요.',
};

/** 사진 올리기가 실패한 이유를 사용자 문구로. */
function uploadFailureReason(e: unknown): string {
  return e instanceof ApiError && e.code === 'NOT_AN_IMAGE'
    ? messageFor(e.code)
    : '잠시 후 다시 시도해 주세요.';
}

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

function PhotoBox({
  title,
  hint,
  label,
  photo,
  onPress,
}: {
  title: string;
  hint: string;
  label: string;
  photo: Photo;
  onPress: () => void;
}) {
  return (
    <View style={styles.photoCol}>
      <Text style={styles.photoTitle}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.photoBox} onPress={onPress}>
        {photo.uri ? (
          <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.imageHint}>눌러서 고르기</Text>
        )}
        {photo.uploading && (
          <View style={styles.photoBusy}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </Pressable>
      <Text style={styles.photoHint}>{hint}</Text>
    </View>
  );
}

/**
 * 기프티콘 올리기와 수정이 같이 쓰는 입력 폼.
 * - 사진은 두 장: 원본(바코드가 있는 전체 사진, 당첨자만 봄)과 보여주는 사진(바코드를 잘라 낸 사진, 모두가 봄).
 *   고르는 즉시 서버에 올리고, 제출할 때는 올린 경로만 넘긴다.
 * - 새로 올릴 때 원본 사진을 고르면 서버가 사진을 읽어 비어 있는 칸을 채워 준다 (사용자가 적은 값은 건드리지 않는다).
 * - initial이 없으면 새로 올리기(사진 두 장 필수), 있으면 수정(사진은 바꿀 때만 고른다).
 * - termsLocked면 액면가·유효기간·당첨 확률을 못 바꾼다 (이미 뽑은 사람이 있는 매물).
 */
export function ListingForm({
  initial,
  existingImageUrl = null,
  existingPreviewUrl = null,
  termsLocked = false,
  submitLabel,
  busy,
  onSubmit,
}: {
  initial?: ListingFormInitial;
  existingImageUrl?: string | null;
  existingPreviewUrl?: string | null;
  termsLocked?: boolean;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: ListingFormValues) => void;
}) {
  const rules = useRules();
  const editing = initial !== undefined;
  const [original, setOriginal] = useState<Photo>({ uri: existingImageUrl, uploading: false });
  const [preview, setPreview] = useState<Photo>({ uri: existingPreviewUrl, uploading: false });
  const [readState, setReadState] = useState<ReadState>('idle');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'cafe');
  // 사용자가 카테고리를 직접 골랐으면 자동 입력이 바꾸지 않는다.
  const categoryChosen = useRef(editing);
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [productName, setProductName] = useState(initial?.product_name ?? '');
  const [faceText, setFaceText] = useState(initial ? String(initial.face_value) : '');
  const [expiresOn, setExpiresOn] = useState(initial?.expires_on ?? '');
  const [barcode, setBarcode] = useState(initial?.barcode_number ?? '');
  const [probability, setProbability] = useState<Probability | null>(initial?.probability ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // 자르기 화면에 띄울 사진. null이면 자르기 화면이 닫혀 있다.
  const [cropUri, setCropUri] = useState<string | null>(null);
  // 지금 고른 원본 사진에서 찾은 바코드의 위치 (자르기 화면이 그 위까지만 골라 두도록).
  const [barcodeTop, setBarcodeTop] = useState<{ uri: string; top: number } | null>(null);
  // 사진을 연달아 바꿀 때 늦게 끝난 이전 작업이 새 사진을 덮어쓰지 않게 한다.
  const originalTurn = useRef(0);
  const previewTurn = useRef(0);

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

  /**
   * 읽어 온 값으로 비어 있는 칸만 채운다 (읽는 동안 사용자가 적은 값은 그대로 둔다).
   * 사진에서 읽힌 항목이 하나라도 있으면 true.
   */
  function applyReading(r: GifticonReading): boolean {
    const ifEmpty = (value: string | null) => (prev: string) =>
      prev.trim() === '' && value !== null ? value : prev;
    setBrand(ifEmpty(r.brand));
    setProductName(ifEmpty(r.product_name));
    setBarcode(ifEmpty(r.barcode_number));
    setFaceText(ifEmpty(r.face_value === null ? null : String(r.face_value)));
    setExpiresOn(ifEmpty(r.expires_on));
    if (r.category !== null && !categoryChosen.current) setCategory(r.category);
    return Object.values(r).some((v) => v !== null);
  }

  async function pick(): Promise<string | null> {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      return !r.canceled && r.assets[0] ? r.assets[0].uri : null;
    } catch (e) {
      console.warn('image pick failed', (e as Error).message);
      showMessage('사진을 불러오지 못했어요');
      return null;
    }
  }

  async function pickOriginal() {
    const uri = await pick();
    if (!uri) return;
    const turn = ++originalTurn.current;
    const before = original;
    setOriginal({ uri, uploading: true });
    setReadState('idle');
    let path: string;
    try {
      path = await uploadGifticonImage(uri);
    } catch (e) {
      if (turn !== originalTurn.current) return;
      setOriginal({ ...before, uploading: false });
      showMessage('사진을 올리지 못했어요', uploadFailureReason(e));
      return;
    }
    if (turn !== originalTurn.current) return;
    setOriginal({ uri, uploading: false, path });
    // 수정할 때는 이미 정보가 채워져 있으므로 다시 읽지 않는다.
    if (editing) return;
    setReadState('reading');
    try {
      const { fields, barcodeTop: top, ai } = await readGifticon(path);
      if (turn !== originalTurn.current) return;
      setBarcodeTop(top === null ? null : { uri, top });
      // AI 없이 읽었을 때는 바코드 번호만 채워지므로 안내를 달리한다.
      setReadState(!applyReading(fields) ? 'empty' : ai ? 'filled' : 'barcodeOnly');
    } catch (e) {
      if (turn !== originalTurn.current) return;
      console.warn('gifticon read failed', (e as Error).message);
      setReadState('unavailable');
    }
  }

  /**
   * 보여주는 사진 만들기: 원본 사진이 있으면 그 사진을 자르기 화면에 띄우고, 없으면 사진을 먼저 고른다.
   * 사진 고르기 창의 자르기 기능은 웹에 없고 폰마다 달라서, 앱 안의 자르기 화면을 쓴다.
   */
  async function startPreview(pickNew: boolean) {
    const uri = !pickNew && original.uri ? original.uri : await pick();
    if (uri) setCropUri(uri);
  }

  /** 자르기 화면에서 잘라 낸 사진을 보여주는 사진으로 올린다. */
  async function uploadPreview(uri: string) {
    setCropUri(null);
    const turn = ++previewTurn.current;
    const before = preview;
    setPreview({ uri, uploading: true });
    try {
      const path = await uploadPreviewImage(uri);
      if (turn !== previewTurn.current) return;
      setPreview({ uri, uploading: false, path });
    } catch (e) {
      if (turn !== previewTurn.current) return;
      setPreview({ ...before, uploading: false });
      showMessage('사진을 올리지 못했어요', uploadFailureReason(e));
    }
  }

  const face = faceText ? Number(faceText) : 0;
  const photosReady =
    !original.uploading && !preview.uploading && (editing || (!!original.path && !!preview.path));
  const valid =
    photosReady &&
    brand.trim().length > 0 &&
    productName.trim().length > 0 &&
    face > 0 &&
    isRealDate(expiresOn) &&
    probability !== null;

  function submit() {
    if (!valid || busy || probability === null) return;
    onSubmit({
      image_path: original.path,
      preview_path: preview.path,
      category,
      brand: brand.trim(),
      product_name: productName.trim(),
      face_value: face,
      expires_on: expiresOn,
      probability,
      barcode_number: barcode.trim() || undefined,
    });
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
        <View style={styles.photos}>
          <PhotoBox
            title="원본 사진"
            hint="바코드가 보이는 전체 사진. 당첨자만 봐요"
            label="원본 사진 고르기"
            photo={original}
            onPress={pickOriginal}
          />
          <PhotoBox
            title="보여주는 사진"
            hint="바코드를 잘라 낸 사진. 눌러서 잘라요. 모두에게 보여요"
            label="보여주는 사진 고르기"
            photo={preview}
            onPress={() => startPreview(false)}
          />
        </View>
        {readState !== 'idle' && (
          <Text
            style={[
              styles.readNote,
              (readState === 'filled' || readState === 'barcodeOnly') && styles.readNoteOk,
            ]}>
            {READ_NOTE[readState]}
          </Text>
        )}

        <Text style={styles.label}>카테고리</Text>
        <View style={styles.chipsWrap}>
          <CategoryChips
            includeAll={false}
            value={category}
            onChange={(v) => {
              if (v === 'all') return;
              setCategory(v);
              categoryChosen.current = true;
            }}
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

        <Text style={styles.label}>바코드 번호 (선택)</Text>
        <TextInput style={styles.input} value={barcode} onChangeText={setBarcode} autoCapitalize="none" />

        {termsLocked ? (
          <Text style={styles.locked}>
            이미 뽑은 사람이 있어서 아래 액면가·유효기간·당첨 확률은 바꿀 수 없어요
          </Text>
        ) : null}

        <Text style={styles.label}>액면가</Text>
        <TextInput
          style={[styles.input, termsLocked && styles.inputLocked]}
          value={faceText}
          onChangeText={(t) => setFaceText(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="예) 4500"
          editable={!termsLocked}
        />

        <Text style={styles.label}>유효기간</Text>
        {Platform.OS === 'web' ? (
          // 날짜 선택기 라이브러리가 웹을 지원하지 않아 직접 입력받는다.
          <TextInput
            style={[styles.input, termsLocked && styles.inputLocked]}
            value={expiresOn}
            onChangeText={(t) => setExpiresOn(t.replace(/[^\d-]/g, '').slice(0, 10))}
            placeholder="YYYY-MM-DD"
            editable={!termsLocked}
          />
        ) : (
          <Pressable
            style={[styles.input, termsLocked && styles.inputLocked]}
            disabled={termsLocked}
            onPress={openDatePicker}>
            <Text style={expiresOn ? styles.inputText : styles.placeholder}>
              {expiresOn || '날짜 선택'}
            </Text>
          </Pressable>
        )}
        {showDatePicker && Platform.OS === 'ios' && (
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

        <Text style={styles.label}>당첨 확률</Text>
        <PresetPicker
          faceValue={face}
          value={probability}
          onChange={setProbability}
          disabled={termsLocked}
        />

        {probability !== null && face > 0 && (
          <Text style={styles.explain}>
            {`꽝이 날 때마다 ${formatWon(net)}이 들어오고, 당첨되면 기프티콘이 넘어갑니다`}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button title={submitLabel} disabled={!valid} busy={busy} onPress={submit} />
      </View>

      <CropModal
        uri={cropUri}
        barcodeTop={barcodeTop && barcodeTop.uri === cropUri ? barcodeTop.top : null}
        onCancel={() => setCropUri(null)}
        onDone={uploadPreview}
        onPickAnother={() => startPreview(true)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.screen, gap: 8 },
  photos: { flexDirection: 'row', gap: space.gap },
  photoCol: { flex: 1, gap: 6 },
  photoTitle: { ...type.label, color: colors.ink },
  photoBox: {
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoBusy: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    opacity: 0.7,
  },
  photoHint: type.meta,
  image: { width: '100%', height: '100%' },
  imageHint: { color: colors.sub, fontSize: 14 },
  readNote: {
    ...type.body,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.bg2,
    color: colors.sub,
  },
  readNoteOk: { backgroundColor: colors.primarySoft, color: colors.primary },
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
  inputLocked: { opacity: 0.5 },
  inputText: { fontSize: 16, color: colors.ink },
  placeholder: { fontSize: 16, color: colors.faint },
  locked: {
    ...type.body,
    marginTop: 12,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.holdBg,
    color: colors.holdFg,
  },
  pickerBox: {
    borderRadius: radius.sm,
    backgroundColor: colors.bg2,
    marginTop: 6,
    alignItems: 'center',
  },
  pickerDone: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10 },
  pickerDoneText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  explain: { ...type.body, marginTop: 8, color: colors.ink },
  footer: {
    padding: space.screen,
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
