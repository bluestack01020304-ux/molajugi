import { act } from 'react';
import { Image, TextInput } from 'react-native';
import { create, type ReactTestRenderer } from 'react-test-renderer';

import { ListingForm, type ListingFormInitial } from '../ListingForm';

// 폼은 useRules의 기본값만 쓴다. 실제 Supabase 클라이언트(기기 저장소 필요)는 불러오지 않는다.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
// 실제 자르기(기기 기능)는 대신 잘라 낸 사진의 주소만 돌려준다.
jest.mock('@/lib/cropImage', () => ({ cropImage: jest.fn(async () => 'file:///cropped.jpg') }));
jest.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  messageFor: (code: string) => code,
  uploadGifticonImage: jest.fn(),
  uploadPreviewImage: jest.fn(),
  readGifticon: jest.fn(),
}));

const picker = jest.requireMock('expo-image-picker') as { launchImageLibraryAsync: jest.Mock };
const api = jest.requireMock('@/lib/api') as {
  uploadGifticonImage: jest.Mock;
  uploadPreviewImage: jest.Mock;
  readGifticon: jest.Mock;
};

const NOTHING_READ = {
  brand: null,
  product_name: null,
  face_value: null,
  expires_on: null,
  barcode_number: null,
  category: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  // 테스트 환경에는 실제 사진이 없으므로 사진 크기를 고정해 알려 준다.
  jest.spyOn(Image, 'getSize').mockImplementation(((_uri: string, ok: (w: number, h: number) => void) => {
    ok(600, 900);
  }) as any);
  picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///picked.jpg' }] });
  api.uploadGifticonImage.mockResolvedValue('uid/original.jpg');
  api.uploadPreviewImage.mockResolvedValue('uid/preview.jpg');
  api.readGifticon.mockResolvedValue({ fields: NOTHING_READ, barcodeTop: null, ai: false });
});

const initial: ListingFormInitial = {
  category: 'cafe',
  brand: '스타벅스',
  product_name: '아메리카노 T',
  face_value: 4500,
  expires_on: '2099-12-31',
  probability: 50,
  barcode_number: '1234 5678',
};

async function render(props: Partial<React.ComponentProps<typeof ListingForm>>): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<ListingForm submitLabel="수정 완료" busy={false} onSubmit={() => {}} {...props} />);
  });
  return r;
}

const byLabel = (r: ReactTestRenderer, label: string) =>
  r.root.findAll((n: any) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
const submitButton = (r: ReactTestRenderer) =>
  r.root.findAll(
    (n: any) =>
      n.props.accessibilityRole === 'button' &&
      n.props.accessibilityLabel === undefined &&
      typeof n.props.onPress === 'function',
  )[0];
const input = (r: ReactTestRenderer, placeholder: string) =>
  r.root.findAllByType(TextInput).find((i) => i.props.placeholder === placeholder)!;
const pickPhoto = (r: ReactTestRenderer, label: string) => act(async () => byLabel(r, label).props.onPress());
const buttonTitled = (r: ReactTestRenderer, title: string) =>
  r.root.findAll(
    (n: any) =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.onPress === 'function' &&
      JSON.stringify(n.props.children ?? '').includes(title),
  )[0];
/** 보여주는 사진 칸을 눌러 자르기 화면을 열고 "자르기"까지 누른다. */
async function cropPreview(r: ReactTestRenderer) {
  await pickPhoto(r, '보여주는 사진 고르기');
  await act(async () => {}); // 사진 크기를 재는 동안 기다린다
  await act(async () => cropButton(r).props.onPress());
}
const cropButton = (r: ReactTestRenderer) =>
  r.root.findAll((n: any) => n.props.title === '자르기' && typeof n.props.onPress === 'function')[0];

test('new_listing_needs_both_photos', async () => {
  const r = await render({ submitLabel: '올리기' });
  await act(async () => input(r, '예) 스타벅스').props.onChangeText('스타벅스'));
  await act(async () => input(r, '예) 아메리카노 T').props.onChangeText('아메리카노 T'));
  await act(async () => input(r, '예) 4500').props.onChangeText('4500'));
  expect(submitButton(r).props.accessibilityState.disabled).toBe(true);
  await pickPhoto(r, '원본 사진 고르기');
  expect(submitButton(r).props.accessibilityState.disabled).toBe(true); // 보여주는 사진이 아직 없다
  await cropPreview(r);
  expect(api.uploadGifticonImage).toHaveBeenCalledWith('file:///picked.jpg');
  // 보여주는 사진은 원본을 잘라 낸 결과가 올라간다 (사진을 다시 고르지 않는다).
  expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(api.uploadPreviewImage).toHaveBeenCalledWith('file:///cropped.jpg');
  expect(submitButton(r).props.accessibilityState.disabled).toBe(true); // 확률을 아직 안 골랐다
});

test('original_photo_fills_empty_fields_but_keeps_what_the_seller_typed', async () => {
  api.readGifticon.mockResolvedValue({
    fields: {
      brand: '투썸플레이스',
      product_name: '아이스 아메리카노 R',
      face_value: 4700,
      expires_on: '2099-06-30',
      barcode_number: '9401 2233 5566',
      category: 'cafe',
    },
    barcodeTop: 0.62,
    ai: true,
  });
  const r = await render({ submitLabel: '올리기' });
  await act(async () => input(r, '예) 스타벅스').props.onChangeText('내가 적은 브랜드'));
  await pickPhoto(r, '원본 사진 고르기');
  expect(api.readGifticon).toHaveBeenCalledWith('uid/original.jpg');
  expect(input(r, '예) 스타벅스').props.value).toBe('내가 적은 브랜드');
  expect(input(r, '예) 아메리카노 T').props.value).toBe('아이스 아메리카노 R');
  expect(input(r, '예) 4500').props.value).toBe('4700');
  expect(JSON.stringify(r.toJSON())).toMatch(/사진에서 읽은 정보를 채웠어요/);
});

test('reading_failure_falls_back_to_manual_entry', async () => {
  api.readGifticon.mockRejectedValue(new Error('READER_NOT_CONFIGURED'));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const r = await render({ submitLabel: '올리기' });
  await pickPhoto(r, '원본 사진 고르기');
  expect(JSON.stringify(r.toJSON())).toMatch(/직접 입력해 주세요/);
  expect(input(r, '예) 스타벅스').props.value).toBe('');
  warn.mockRestore();
});

test('edit_prefills_and_submits_without_new_photos', async () => {
  const onSubmit = jest.fn();
  const r = await render({ initial, onSubmit });
  await act(async () => input(r, '예) 스타벅스').props.onChangeText('  투썸  '));
  expect(submitButton(r).props.accessibilityState.disabled).toBe(false);
  await act(async () => submitButton(r).props.onPress());
  expect(onSubmit).toHaveBeenCalledWith({
    image_path: undefined,
    preview_path: undefined,
    category: 'cafe',
    brand: '투썸',
    product_name: '아메리카노 T',
    face_value: 4500,
    expires_on: '2099-12-31',
    probability: 50,
    barcode_number: '1234 5678',
  });
});

test('edit_sends_only_the_photo_that_changed_and_does_not_reread_it', async () => {
  const onSubmit = jest.fn();
  const r = await render({ initial, onSubmit });
  await pickPhoto(r, '원본 사진 고르기');
  await cropPreview(r);
  expect(api.readGifticon).not.toHaveBeenCalled();
  await act(async () => submitButton(r).props.onPress());
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    image_path: 'uid/original.jpg',
    preview_path: 'uid/preview.jpg',
    brand: '스타벅스',
  });
});

test('edit_locks_price_terms_after_someone_drew', async () => {
  const r = await render({ initial, termsLocked: true });
  expect(JSON.stringify(r.toJSON())).toMatch(/이미 뽑은 사람이 있어서/);
  expect(input(r, '예) 4500').props.editable).toBe(false);
  // 이름 같은 정보는 여전히 고칠 수 있다.
  expect(input(r, '예) 스타벅스').props.editable).not.toBe(false);
});

test('edit_unlocked_keeps_price_terms_editable', async () => {
  const r = await render({ initial });
  expect(JSON.stringify(r.toJSON())).not.toMatch(/이미 뽑은 사람이 있어서/);
  expect(input(r, '예) 4500').props.editable).toBe(true);
});

test('without_ai_only_the_decoded_barcode_number_is_filled', async () => {
  api.readGifticon.mockResolvedValue({
    fields: { ...NOTHING_READ, barcode_number: '9401 2233 5566' },
    barcodeTop: 0.62,
    ai: false,
  });
  const r = await render({ submitLabel: '올리기' });
  await pickPhoto(r, '원본 사진 고르기');
  const barcode = r.root.findAllByType(TextInput).find((i) => i.props.value === '9401 2233 5566');
  expect(barcode).toBeDefined();
  expect(input(r, '예) 스타벅스').props.value).toBe('');
  expect(JSON.stringify(r.toJSON())).toMatch(/바코드 번호를 읽어 채웠어요/);
});

test('crop_screen_starts_just_above_the_decoded_barcode', async () => {
  api.readGifticon.mockResolvedValue({ fields: NOTHING_READ, barcodeTop: 0.62, ai: false });
  const r = await render({ submitLabel: '올리기' });
  await pickPhoto(r, '원본 사진 고르기');
  await pickPhoto(r, '보여주는 사진 고르기');
  await act(async () => {});
  expect(JSON.stringify(r.toJSON())).toMatch(/바코드를 찾아서 그 위까지만 골라 뒀어요/);
});
