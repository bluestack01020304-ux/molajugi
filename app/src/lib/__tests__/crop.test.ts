import { MIN_CROP, dragRect, fitSize, initialCrop, toPixelCrop, zoneAt } from '../crop';

const bounds = { width: 300, height: 400 };
const rect = { x: 50, y: 60, width: 200, height: 240 };

test('fitSize keeps the aspect ratio inside the box', () => {
  expect(fitSize({ width: 600, height: 900 }, { width: 400, height: 450 })).toEqual({ width: 300, height: 450 });
  expect(fitSize({ width: 1000, height: 500 }, { width: 400, height: 450 })).toEqual({ width: 400, height: 200 });
});

test('initialCrop covers the top 60 percent, where the barcode usually is not', () => {
  expect(initialCrop({ width: 300, height: 400 })).toEqual({ x: 0, y: 0, width: 300, height: 240 });
});

test('zoneAt tells corners, edges and the inside apart', () => {
  expect(zoneAt(rect, 52, 58)).toBe('tl');
  expect(zoneAt(rect, 248, 302)).toBe('br');
  expect(zoneAt(rect, 150, 298)).toBe('b');
  expect(zoneAt(rect, 252, 180)).toBe('r');
  expect(zoneAt(rect, 150, 180)).toBe('move');
});

test('dragging the bottom edge resizes without leaving the photo or collapsing', () => {
  expect(dragRect(rect, 'b', 0, 50, bounds)).toEqual({ ...rect, height: 290 });
  expect(dragRect(rect, 'b', 0, 999, bounds).height).toBe(340); // 사진 아래 끝까지만
  expect(dragRect(rect, 'b', 0, -999, bounds).height).toBe(MIN_CROP);
});

test('dragging a corner moves two edges at once', () => {
  expect(dragRect(rect, 'tl', 20, 30, bounds)).toEqual({ x: 70, y: 90, width: 180, height: 210 });
  expect(dragRect(rect, 'tl', -999, -999, bounds)).toEqual({ x: 0, y: 0, width: 250, height: 300 });
});

test('moving the whole rectangle keeps its size and stays inside', () => {
  expect(dragRect(rect, 'move', 10, -20, bounds)).toEqual({ ...rect, x: 60, y: 40 });
  expect(dragRect(rect, 'move', 999, 999, bounds)).toEqual({ ...rect, x: 100, y: 160 });
});

test('toPixelCrop scales to the original photo and never exceeds it', () => {
  const image = { width: 600, height: 800 };
  expect(toPixelCrop(rect, bounds, image)).toEqual({ originX: 100, originY: 120, width: 400, height: 480 });
  expect(toPixelCrop({ x: 0, y: 0, width: 300, height: 400 }, bounds, image)).toEqual({
    originX: 0,
    originY: 0,
    width: 600,
    height: 800,
  });
});

test('initialCrop stops just above the barcode when its position is known', () => {
  const shown = { width: 300, height: 400 };
  // 바코드 윗변이 높이의 62% 지점 → 60%까지만 (2% 여유)
  expect(initialCrop(shown, 0.62).height).toBeCloseTo(240);
  expect(initialCrop(shown, 0.8).height).toBeCloseTo(312);
  // 바코드가 맨 위에 있으면 제안할 영역이 없으므로 기본값(60%)
  expect(initialCrop(shown, 0.05)).toEqual({ x: 0, y: 0, width: 300, height: 240 });
  expect(initialCrop(shown, null)).toEqual({ x: 0, y: 0, width: 300, height: 240 });
});
