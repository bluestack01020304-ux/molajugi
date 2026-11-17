// 매물 올리기(create-listing)와 수정(update-listing)이 같이 쓰는 입력 검사.
import { HttpError } from "./http.ts";

const CATEGORIES = ["cafe", "convenience", "chicken_pizza", "bakery", "dining", "etc"];

// int4 범위 안에서 넉넉한 상한. 이보다 크면 가격 계산·잔액 합산이 넘칠 수 있다.
const MAX_FACE_VALUE = 2_000_000_000;

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

const isRealDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export interface ListingFields {
  category: string;
  brand: string;
  product_name: string;
  face_value: number;
  expires_on: string;
  /** 숫자인지만 본다. 허용된 확률인지는 규칙(app_config)을 읽은 쪽에서 검사한다. */
  probability: number;
  barcode: string | null;
}

/** 형식이 틀리면 400 BAD_REQUEST. 문자열은 앞뒤 공백을 떼어 돌려준다. */
export function parseListingFields(b: Record<string, unknown>): ListingFields {
  const { category, brand, product_name, face_value, expires_on, probability, barcode_number } = b;
  if (
    typeof category !== "string" || !CATEGORIES.includes(category) || !isStr(brand) || !isStr(product_name) ||
    typeof face_value !== "number" || !Number.isInteger(face_value) || face_value <= 0 || face_value > MAX_FACE_VALUE ||
    typeof expires_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expires_on) || !isRealDate(expires_on) ||
    typeof probability !== "number" ||
    (barcode_number != null && typeof barcode_number !== "string")
  ) throw new HttpError(400, "BAD_REQUEST");
  return {
    category,
    brand: brand.trim(),
    product_name: product_name.trim(),
    face_value,
    expires_on,
    probability,
    barcode: (barcode_number as string | null | undefined)?.trim() || null,
  };
}

/** 이미지 경로는 반드시 `{본인 uid}/{파일}.jpg|png` 꼴이어야 한다. 아니면 400 BAD_REQUEST. */
export function requireOwnImagePath(imagePath: unknown, userId: string): string {
  if (!isStr(imagePath)) throw new HttpError(400, "BAD_REQUEST");
  const parts = imagePath.split("/");
  if (
    parts.length !== 2 || parts[0] !== userId || parts[1] === "" || parts[1] === ".." || parts[1] === "." ||
    imagePath.includes("\\") || !/\.(jpe?g|png)$/i.test(parts[1])
  ) throw new HttpError(400, "BAD_REQUEST");
  return imagePath;
}
