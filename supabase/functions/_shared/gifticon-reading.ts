// 기프티콘 원본 사진에서 읽어 낸 정보의 모양과, 모델이 돌려준 값을 믿을 수 있는 형태로 다듬는 규칙.
// 모델 출력은 틀릴 수 있으므로 여기서 한 번 더 걸러 내고, 사용자는 폼에서 확인·수정한다.

export const READING_CATEGORIES = ["cafe", "convenience", "chicken_pizza", "bakery", "dining", "etc"] as const;
export type ReadingCategory = (typeof READING_CATEGORIES)[number];

/** 사진에서 읽지 못한 항목은 null. */
export interface GifticonReading {
  brand: string | null;
  product_name: string | null;
  /** 금액권처럼 사진에 금액이 찍혀 있을 때만. 원 단위 정수. */
  face_value: number | null;
  /** 유효기간 마지막 날, YYYY-MM-DD. */
  expires_on: string | null;
  barcode_number: string | null;
  category: ReadingCategory | null;
}

export const EMPTY_READING: GifticonReading = {
  brand: null,
  product_name: null,
  face_value: null,
  expires_on: null,
  barcode_number: null,
  category: null,
};

// create-listing이 받는 상한과 같다.
const MAX_FACE_VALUE = 2_000_000_000;

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s === "" ? null : s.slice(0, max);
};

const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** 모델이 준 값(무엇이든)을 GifticonReading으로. 형식이 틀린 항목은 버리고 null로 둔다. */
export function normalizeReading(raw: unknown): GifticonReading {
  if (!raw || typeof raw !== "object") return { ...EMPTY_READING };
  const r = raw as Record<string, unknown>;

  const face = typeof r.face_value === "number" && Number.isInteger(r.face_value) &&
      r.face_value > 0 && r.face_value <= MAX_FACE_VALUE
    ? r.face_value
    : null;

  const date = text(r.expires_on, 10);
  // 바코드 번호는 숫자와 띄어쓰기만 남긴다. 너무 짧거나 길면 잘못 읽은 것으로 본다.
  const digits = text(r.barcode_number, 60)?.replace(/[^\d ]/g, "").replace(/ +/g, " ").trim() ?? "";
  const digitCount = digits.replace(/ /g, "").length;

  return {
    brand: text(r.brand, 40),
    product_name: text(r.product_name, 80),
    face_value: face,
    expires_on: date && isRealDate(date) ? date : null,
    barcode_number: digitCount >= 8 && digitCount <= 40 ? digits : null,
    category: READING_CATEGORIES.includes(r.category as ReadingCategory) ? (r.category as ReadingCategory) : null,
  };
}

/**
 * 바코드를 해독해 얻은 글자를 폼에 넣을 바코드 번호로. 숫자로만 된 8~40자리일 때만 쓰고,
 * 읽기 쉽게 네 자리씩 띄운다 (예: "940122335566" → "9401 2233 5566"). 그 밖의 값은 null.
 */
export function barcodeNumberFromScan(text: string): string | null {
  const digits = text.trim();
  if (!/^\d{8,40}$/.test(digits)) return null;
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}
