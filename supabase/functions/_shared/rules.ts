// 이 파일이 확률을 굴리고 돈을 나누는 유일한 곳이다.

export type Probability = 25 | 50 | 75;

export interface Rules {
  probabilities: Probability[];
  feeRate: number;
  holdDays: number;
  expiryNoticeDays: number[];
  minDaysToList: number;
  topupAmount: number;
}

const DAY_MS = 86400000;

/** 액면가 × 확률 ÷ 100, 10원 단위 반올림. */
export function calcPrice(faceValue: number, probability: Probability): number {
  return Math.round(faceValue * probability / 100 / 10) * 10;
}

/** 수수료는 1원 단위 반올림, 순수익 = 총액 − 수수료. */
export function splitFee(gross: number, feeRate: number): { fee: number; net: number } {
  const fee = Math.round(gross * feeRate);
  return { fee, net: gross - fee };
}

/** random은 [0, 1). random < probability/100 이면 당첨. */
export function rollOutcome(probability: Probability, random: number): "win" | "miss" {
  return random < probability / 100 ? "win" : "miss";
}

export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

/** KST 기준 오늘 날짜 YYYY-MM-DD. */
export function todayKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}

/** 두 YYYY-MM-DD 문자열 사이의 일수 차 (expiresOn − today). */
export function daysLeft(expiresOn: string, today: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(expiresOn) - toUtc(today)) / DAY_MS);
}

export function canList(expiresOn: string, today: string, rules: Rules): boolean {
  return daysLeft(expiresOn, today) >= rules.minDaysToList;
}

export function shouldDelist(expiresOn: string, today: string): boolean {
  return daysLeft(expiresOn, today) <= 1;
}

export function isNoticeDue(expiresOn: string, today: string, rules: Rules): boolean {
  return rules.expiryNoticeDays.includes(daysLeft(expiresOn, today));
}

export function releaseAt(createdAt: Date, rules: Rules): Date {
  return new Date(createdAt.getTime() + rules.holdDays * DAY_MS);
}
