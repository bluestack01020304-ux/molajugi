import { daysLeftLabel, formatPoints, previewPrice } from '../format';

test('formatPoints', () => expect(formatPoints(3500)).toBe('3,500P'));
test('daysLeftLabel', () => {
  expect(daysLeftLabel('2026-11-19', '2026-11-07')).toBe('12일 남음');
  expect(daysLeftLabel('2026-11-07', '2026-11-07')).toBe('오늘까지');
  expect(daysLeftLabel('2026-11-06', '2026-11-07')).toBe('만료');
});
test('previewPrice matches server rounding', () => expect(previewPrice(4500, 25)).toBe(1130));
