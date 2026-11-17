import { loadRules } from "../_shared/config.ts";
import { sql } from "../_shared/db.ts";
import { requireUser } from "../_shared/auth.ts";
import { HttpError, handle, json } from "../_shared/http.ts";
import { parseListingFields, requireOwnImagePath } from "../_shared/listing-input.ts";
import { calcPrice, canList, todayKst, type Probability } from "../_shared/rules.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 판매자가 자기 매물을 고친다. 판매중(active)일 때만 되고, 가격은 여기서 다시 계산한다.
// 누가 한 번이라도 뽑은 뒤(miss_count > 0)에는 액면가·확률·유효기간을 바꿀 수 없다:
// 이미 돈을 낸 구매자와 다른 조건으로 같은 매물을 팔게 되기 때문이다.
Deno.serve(handle(async (req) => {
  const userId = await requireUser(req);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") throw new HttpError(400, "BAD_REQUEST");
  const id = b.id;
  if (typeof id !== "string" || !UUID.test(id)) throw new HttpError(400, "BAD_REQUEST");
  const f = parseListingFields(b);
  // 사진은 바꿀 때만 보낸다. 안 보내면 기존 사진을 그대로 둔다.
  const imagePath = b.image_path == null ? null : requireOwnImagePath(b.image_path, userId);
  const previewPath = b.preview_path == null ? null : requireOwnImagePath(b.preview_path, userId);
  const rules = await loadRules(sql);

  const price = await sql.begin(async (tx) => {
    // draw 함수와 같은 행 잠금을 잡아, 수정과 뽑기가 겹쳐도 miss_count를 정확히 본다.
    const [l] = await tx`
      select seller_id, face_value, probability, price, expires_on::text as expires_on, status, miss_count
      from listings where id = ${id} for update`;
    // 남의 매물은 있는지조차 알려 주지 않는다.
    if (!l || l.seller_id !== userId) throw new HttpError(404, "LISTING_NOT_FOUND");
    if (l.status !== "active") throw new HttpError(409, "LISTING_NOT_ACTIVE");

    const priceTermsChanged = f.face_value !== l.face_value || f.probability !== l.probability;
    const expiryChanged = f.expires_on !== l.expires_on;
    if ((priceTermsChanged || expiryChanged) && l.miss_count > 0) throw new HttpError(409, "LISTING_LOCKED");
    if (f.probability !== l.probability && !rules.probabilities.includes(f.probability as Probability)) {
      throw new HttpError(400, "INVALID_PROBABILITY");
    }
    if (expiryChanged && !canList(f.expires_on, todayKst(), rules)) throw new HttpError(400, "EXPIRY_TOO_SOON");

    const next = priceTermsChanged ? calcPrice(f.face_value, f.probability as Probability) : (l.price as number);
    // 10원 단위 반올림으로 가격이 0이 되는 아주 작은 액면가는 받지 않는다.
    if (next <= 0) throw new HttpError(400, "BAD_REQUEST");

    await tx`
      update listings set category = ${f.category}, brand = ${f.brand}, product_name = ${f.product_name},
        face_value = ${f.face_value}, expires_on = ${f.expires_on}, probability = ${f.probability}, price = ${next},
        preview_path = coalesce(${previewPath}, preview_path)
      where id = ${id}`;
    await tx`
      update listing_secrets set barcode_number = ${f.barcode}, image_path = coalesce(${imagePath}, image_path)
      where listing_id = ${id}`;
    return next;
  });
  return json({ id, price });
}));
