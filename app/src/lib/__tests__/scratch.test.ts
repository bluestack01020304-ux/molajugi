import { GRID, cardSize, cellIndexAt, isRevealComplete } from '../scratch';

test('GRID is 10 x 14', () => {
  expect(GRID).toEqual({ cols: 10, rows: 14 });
});
test('cellIndexAt maps coordinates to grid', () => {
  expect(cellIndexAt(0, 0, 300, 420)).toBe(0);
  expect(cellIndexAt(299, 419, 300, 420)).toBe(139);
  expect(cellIndexAt(-1, 0, 300, 420)).toBeNull();
  expect(cellIndexAt(300, 0, 300, 420)).toBeNull();
});
test('isRevealComplete at 60%', () => {
  expect(isRevealComplete(83, 140)).toBe(false);
  expect(isRevealComplete(84, 140)).toBe(true);
});
test('cardSize fills a phone screen side to side', () => {
  expect(cardSize(390, 844)).toEqual({ width: 358, height: 501 });
});
test('cardSize stays phone-sized on a wide computer window', () => {
  const { width, height } = cardSize(1536, 735);
  expect(width).toBeLessThanOrEqual(420);
  // 헤더·결과 문구·버튼과 함께 창 안에 들어와야 한다.
  expect(height).toBeLessThanOrEqual(735 - 290);
  expect(height).toBe(Math.round(width * 1.4));
});
test('cardSize never collapses on a tiny window', () => {
  expect(cardSize(200, 150).width).toBe(140);
});
