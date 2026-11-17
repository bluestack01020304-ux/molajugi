import { loadRules } from "../_shared/config.ts";
import { sql } from "../_shared/db.ts";
import { requireUser } from "../_shared/auth.ts";
import { HttpError, handle, json } from "../_shared/http.ts";
import { parseListingFields, requireOwnImagePath } from "../_shared/listing-input.ts";
import { calcPrice, canList, todayKst, type Probability } from "../_shared/rules.ts";

Deno.serve(handle(async (req) => {
  const userId = await requireUser(req);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") throw new HttpError(400, "BAD_REQUEST");
  const f = parseListingFields(b);
  if (typeof b.image_path !== "string" || b.image_path.trim() === "") throw new HttpError(400, "BAD_REQUEST");

  const rules = await loadRules(sql);
  if (!rules.probabilities.includes(f.probability as Probability)) throw new HttpError(400, "INVALID_PROBABILITY");
  if (!canList(f.expires_on, todayKst(), rules)) throw new HttpError(400, "EXPIRY_TOO_SOON");
  const imagePath = requireOwnImagePath(b.image_path, userId);
  // 보여주는 사진(바코드를 잘라 낸 사진)도 반드시 같이 올린다. 공개 버킷 previews의 자기 폴더 경로.
  const previewPath = requireOwnImagePath(b.preview_path, userId);

  const price = calcPrice(f.face_value, f.probability as Probability);
  // 10원 단위 반올림으로 가격이 0이 되는 아주 작은 액면가는 받지 않는다.
  if (price <= 0) throw new HttpError(400, "BAD_REQUEST");
  const id = await sql.begin(async (tx) => {
    const [l] = await tx`
      insert into listings (seller_id, category, brand, product_name, face_value, expires_on, probability, price,
                            preview_path)
      values (${userId}, ${f.category}, ${f.brand}, ${f.product_name}, ${f.face_value}, ${f.expires_on},
              ${f.probability}, ${price}, ${previewPath})
      returning id`;
    await tx`insert into listing_secrets (listing_id, image_path, barcode_number)
             values (${l.id}, ${imagePath}, ${f.barcode})`;
    return l.id as string;
  });
  return json({ id, price });
}));
