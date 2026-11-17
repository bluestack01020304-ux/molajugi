import {
  addDays,
  daysLeft,
  daysLeftLabel,
  formatPoints,
  gifticonFileName,
  previewPrice,
} from '../format';

test('formatPoints', () => expect(formatPoints(3500)).toBe('3,500P'));
test('daysLeftLabel', () => {
  expect(daysLeftLabel('2026-11-19', '2026-11-07')).toBe('12일 남음');
  expect(daysLeftLabel('2026-11-07', '2026-11-07')).toBe('오늘까지');
  expect(daysLeftLabel('2026-11-06', '2026-11-07')).toBe('만료');
});
test('previewPrice matches server rounding', () => expect(previewPrice(4500, 25)).toBe(1130));
test('daysLeft mirrors server', () => {
  expect(daysLeft('2026-11-09', '2026-11-07')).toBe(2);
  expect(daysLeft('2026-11-08', '2026-11-07')).toBe(1);
  expect(daysLeft('2026-11-06', '2026-11-07')).toBe(-1);
});
test('addDays', () => {
  expect(addDays('2026-12-31', 2)).toBe('2027-01-02');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
});
test('gifticonFileName builds a safe, readable file name', () => {
  expect(gifticonFileName('스타벅스', '아메리카노 T', 'uid/abc.jpg')).toBe('몰아주기_스타벅스_아메리카노 T.jpg');
  expect(gifticonFileName('A/B', 'x:y*z?', 'uid/abc.PNG')).toBe('몰아주기_AB_xyz.png');
  expect(gifticonFileName('  ', '', 'uid/abc')).toBe('몰아주기.jpg');
});
