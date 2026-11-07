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

/** app_config 행을 읽어 Rules로 변환한다. 키가 하나라도 없으면 throw. */
export async function loadRules(sql: Sql): Promise<Rules> {
  const rows = await sql<{ key: string; value: unknown }[]>`select key, value from app_config`;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  for (const key of KEYS) {
    if (!map.has(key)) throw new Error(`app_config 키 누락: ${key}`);
  }
  return {
    probabilities: map.get("probabilities") as Probability[],
    feeRate: map.get("fee_rate") as number,
    holdDays: map.get("hold_days") as number,
    expiryNoticeDays: map.get("expiry_notice_days") as number[],
    minDaysToList: map.get("min_days_to_list") as number,
    topupAmount: map.get("topup_amount") as number,
  };
}
