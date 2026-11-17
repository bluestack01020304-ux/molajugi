import { imageKind } from '../imageKind';

const bytes = (...b: number[]) => new Uint8Array(b);

test('recognises PNG and JPEG by their first bytes', () => {
  expect(imageKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe('png');
  expect(imageKind(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe('jpeg');
});

test('rejects anything that is not a photo', () => {
  // 폰에서 파일 읽기가 실패했을 때 실제로 올라갔던 내용
  expect(imageKind(new TextEncoder().encode('File not found'))).toBeNull();
  expect(imageKind(bytes())).toBeNull();
  expect(imageKind(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF
});
