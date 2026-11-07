import { loadRules } from "../_shared/config.ts";
import { sql } from "../_shared/db.ts";
import { requireUser } from "../_shared/auth.ts";
import { HttpError, handle, json } from "../_shared/http.ts";
import { calcPrice, canList, todayKst, type Probability } from "../_shared/rules.ts";

const CATEGORIES = ["cafe", "convenience", "chicken_pizza", "bakery", "dining", "etc"];

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

Deno.serve(handle(async (req) => {
  const userId = await requireUser(req);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") throw new HttpError(400, "BAD_REQUEST");
  const { category, brand, product_name, face_value, expires_on, probability, image_path, barcode_number } = b;
  if (
    !CATEGORIES.includes(category) || !isStr(brand) || !isStr(product_name) ||
    !Number.isInteger(face_value) || face_value <= 0 ||
    typeof expires_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expires_on) ||
    typeof probability !== "number" || !isStr(image_path) ||
    (barcode_number != null && typeof barcode_number !== "string")
  ) throw new HttpError(400, "BAD_REQUEST");

  const rules = await loadRules(sql);
  if (!rules.probabilities.includes(probability as Probability)) throw new HttpError(400, "INVALID_PROBABILITY");
  if (!canList(expires_on, todayKst(), rules)) throw new HttpError(400, "EXPIRY_TOO_SOON");
  if (!image_path.startsWith(`${userId}/`)) throw new HttpError(400, "BAD_REQUEST");

  const price = calcPrice(face_value, probability as Probability);
  const barcode = barcode_number?.trim() || null;
  const id = await sql.begin(async (tx) => {
    const [l] = await tx`
      insert into listings (seller_id, category, brand, product_name, face_value, expires_on, probability, price)
      values (${userId}, ${category}, ${brand}, ${product_name}, ${face_value}, ${expires_on}, ${probability}, ${price})
      returning id`;
    await tx`insert into listing_secrets (listing_id, image_path, barcode_number)
             values (${l.id}, ${image_path}, ${barcode})`;
    return l.id as string;
  });
  return json({ id, price });
}));
