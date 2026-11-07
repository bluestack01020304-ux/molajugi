import type { Probability } from './database.types';

/** 서버 app_config의 규칙값. 서버 supabase/functions/_shared/rules.ts의 Rules와 같은 모양. */
export type AppRules = {
  probabilities: Probability[];
  feeRate: number;
  holdDays: number;
  expiryNoticeDays: number[];
  minDaysToList: number;
  topupAmount: number;
};

/** app_config를 읽기 전(또는 읽기 실패 시) 쓰는 기본값. 설계 문서의 값과 같다. */
export const DEFAULT_RULES: AppRules = {
  probabilities: [25, 50, 75],
  feeRate: 0.1,
  holdDays: 3,
  expiryNoticeDays: [7, 1],
  minDaysToList: 2,
  topupAmount: 10000,
};

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isProbability = (v: unknown): v is Probability => v === 25 || v === 50 || v === 75;

/**
 * app_config 행들을 AppRules로 바꾼다. 빠졌거나 형식이 틀린 키는 기본값을 쓰고 경고한다
 * (서버가 실제 값으로 다시 검증하므로 앱은 표시만 틀릴 뿐 돈 계산이 틀리지는 않는다).
 */
export function parseRules(rows: { key: string; value: unknown }[]): AppRules {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const pick = <T>(key: string, ok: (v: unknown) => v is T, fallback: T): T => {
    const v = m.get(key);
    if (ok(v)) return v;
    console.warn(`app_config ${key} missing or malformed; using default`);
    return fallback;
  };
  return {
    probabilities: pick(
      'probabilities',
      (v): v is Probability[] => Array.isArray(v) && v.length > 0 && v.every(isProbability),
      DEFAULT_RULES.probabilities,
    ),
    feeRate: pick(
      'fee_rate',
      (v): v is number => typeof v === 'number' && v >= 0 && v < 1,
      DEFAULT_RULES.feeRate,
    ),
    holdDays: pick('hold_days', (v): v is number => isInt(v) && v >= 0, DEFAULT_RULES.holdDays),
    expiryNoticeDays: pick(
      'expiry_notice_days',
      (v): v is number[] => Array.isArray(v) && v.every(isInt),
      DEFAULT_RULES.expiryNoticeDays,
    ),
    minDaysToList: pick(
      'min_days_to_list',
      (v): v is number => isInt(v) && v >= 0,
      DEFAULT_RULES.minDaysToList,
    ),
    topupAmount: pick('topup_amount', (v): v is number => isInt(v) && v > 0, DEFAULT_RULES.topupAmount),
  };
}

/** 서버 splitFee와 같은 식(수수료 원 단위 반올림). 표시 전용. */
export function previewNet(price: number, feeRate: number): number {
  return price - Math.round(price * feeRate);
}
