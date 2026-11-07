import { DEFAULT_RULES, parseRules, previewNet } from '../rules';

test('parseRules reads app_config rows', () => {
  const r = parseRules([
    { key: 'probabilities', value: [25, 75] },
    { key: 'fee_rate', value: 0.2 },
    { key: 'hold_days', value: 5 },
    { key: 'expiry_notice_days', value: [3] },
    { key: 'min_days_to_list', value: 4 },
    { key: 'topup_amount', value: 5000 },
  ]);
  expect(r).toEqual({
    probabilities: [25, 75],
    feeRate: 0.2,
    holdDays: 5,
    expiryNoticeDays: [3],
    minDaysToList: 4,
    topupAmount: 5000,
  });
});

test('parseRules falls back to defaults for missing or malformed keys', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect(parseRules([{ key: 'fee_rate', value: '0.1' }, { key: 'probabilities', value: [30] }])).toEqual(
    DEFAULT_RULES,
  );
  warn.mockRestore();
});

test('previewNet mirrors server splitFee', () => {
  expect(previewNet(1000, 0.1)).toBe(900);
  expect(previewNet(1130, 0.1)).toBe(1017);
});
