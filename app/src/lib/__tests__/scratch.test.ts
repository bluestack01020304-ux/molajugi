import { GRID, cellIndexAt, isRevealComplete } from '../scratch';

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
