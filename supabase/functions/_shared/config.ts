import type { Sql } from "npm:postgres@3";
import type { Probability, Rules } from "./rules.ts";

const KEYS = [
  "probabilities",
  "fee_rate",
  "hold_days",
  "expiry_notice_days",
  "min_days_to_list",
  "topup_amount",
] as const;

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isNonNegInt = (v: unknown): v is number => isInt(v) && v >= 0;
const isIntArray = (v: unknown): v is number[] => Array.isArray(v) && v.length > 0 && v.every(isInt);

function bad(key: string, value: unknown): never {
  throw new Error(`app_config 값 형식 오류: ${key} = ${JSON.stringify(value)}`);
}

/** app_config 행을 읽어 Rules로 변환한다. 키가 없거나 값의 형식이 틀리면 키 이름을 담아 throw. */
export async function loadRules(sql: Sql): Promise<Rules> {
  const rows = await sql<{ key: string; value: unknown }[]>`select key, value from app_config`;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  for (const key of KEYS) {
    if (!map.has(key)) throw new Error(`app_config 키 누락: ${key}`);
  }
  const probabilities = map.get("probabilities");
  if (!isIntArray(probabilities) || !probabilities.every((p) => p === 25 || p === 50 || p === 75)) {
    bad("probabilities", probabilities);
  }
  const feeRate = map.get("fee_rate");
  if (typeof feeRate !== "number" || !Number.isFinite(feeRate) || feeRate < 0 || feeRate >= 1) bad("fee_rate", feeRate);
  const holdDays = map.get("hold_days");
  if (!isNonNegInt(holdDays)) bad("hold_days", holdDays);
  const expiryNoticeDays = map.get("expiry_notice_days");
  if (!isIntArray(expiryNoticeDays) || !expiryNoticeDays.every((d) => d >= 0)) bad("expiry_notice_days", expiryNoticeDays);
  const minDaysToList = map.get("min_days_to_list");
  if (!isNonNegInt(minDaysToList)) bad("min_days_to_list", minDaysToList);
  const topupAmount = map.get("topup_amount");
  if (!isInt(topupAmount) || topupAmount <= 0) bad("topup_amount", topupAmount);
  return {
    probabilities: probabilities as Probability[],
    feeRate,
    holdDays,
    expiryNoticeDays,
    minDaysToList,
    topupAmount,
  };
}
