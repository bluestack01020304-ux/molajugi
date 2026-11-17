import Anthropic from "npm:@anthropic-ai/sdk@1";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@1/helpers/zod";
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { z } from "npm:zod@4";
import { requireUser } from "../_shared/auth.ts";
import { findBarcode } from "../_shared/barcode.ts";
import {
  barcodeNumberFromScan,
  EMPTY_READING,
  type GifticonReading,
  normalizeReading,
  READING_CATEGORIES,
} from "../_shared/gifticon-reading.ts";
import { HttpError, handle, json } from "../_shared/http.ts";
import { requireOwnImagePath } from "../_shared/listing-input.ts";

// 판매자가 방금 올린 원본 사진을 읽어 올리기 폼을 미리 채울 정보를 돌려준다. 두 단계로 읽는다.
//  1) 바코드 해독 (항상): 바코드 무늬를 직접 해독해 번호와 위치를 얻는다. AI도 키도 필요 없다.
//     위치는 "보여주는 사진"을 바코드 위까지만 자르도록 제안하는 데 쓴다 (barcode_top).
//  2) 글자 읽기 (ANTHROPIC_API_KEY가 있을 때만): Claude에게 사진을 보여 주고 브랜드·상품명 등을 읽는다.
// 읽은 값은 참고용이다: 사용자가 폼에서 확인하고 고친 뒤 create-listing이 다시 검사한다.

const MODEL = "claude-opus-5-5";
// API가 받는 사진 한 장의 상한. 넘으면 글자 읽기는 건너뛴다.
const MAX_AI_IMAGE_BYTES = 5 * 1024 * 1024;
// 이보다 큰 파일은 아예 다루지 않는다.
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const Reading = z.object({
  brand: z.string().nullable(),
  product_name: z.string().nullable(),
  face_value: z.number().int().nullable(),
  expires_on: z.string().nullable(),
  barcode_number: z.string().nullable(),
  category: z.enum(READING_CATEGORIES).nullable(),
});

const SYSTEM = `You read photos of Korean mobile gift vouchers ("기프티콘") so a seller's listing form can be prefilled.
Report only what is actually printed in the image. Use null for anything that is missing, cut off, or unreadable — a wrong value is worse than an empty one, because the seller reviews the form and fills gaps by hand.

Fields:
- brand: the store or brand that honors the voucher, as printed (e.g. "스타벅스", "CU", "BBQ").
- product_name: the product or voucher name as printed, without the brand (e.g. "아이스 아메리카노 T", "모바일상품권 1만원").
- face_value: the voucher's value in Korean won as an integer, only when an amount is printed (amount vouchers such as "5,000원권" or "1만원"). For a product voucher with no printed amount, use null; do not estimate a price.
- expires_on: the last valid day ("유효기간", "사용기한", "~까지") as YYYY-MM-DD. If a range is printed, use its end date.
- barcode_number: the digits printed under or beside the barcode, keeping the printed spacing. Not an order number or a phone number.
- category: cafe (coffee shops, drinks), convenience (convenience stores, marts), chicken_pizza (chicken, pizza, burgers and similar delivery food), bakery (bakeries, desserts, ice cream), dining (restaurants, meal vouchers), etc (anything else, such as general gift cards). Use null if the brand is not recognizable.

If the image is not a gift voucher, return null for every field.`;

// 파일 이름이 아니라 내용의 첫 바이트로 형식을 정한다 (확장자와 실제 형식이 다르면 API가 거절한다).
function mediaType(bytes: Uint8Array): "image/png" | "image/jpeg" {
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return png ? "image/png" : "image/jpeg";
}

/** Claude에게 사진의 글자를 읽게 한다. 실패하면 빈 결과를 돌려주고 올리기는 계속되게 한다. */
async function readWithClaude(apiKey: string, bytes: Uint8Array): Promise<GifticonReading> {
  const client = new Anthropic({ apiKey, timeout: 40_000, maxRetries: 1 });
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType(bytes), data: encodeBase64(bytes) } },
          { type: "text", text: "Read this gift voucher." },
        ],
      }],
      // 글자를 옮겨 적는 단순한 일이라 낮은 노력 수준으로 충분하다.
      output_config: { effort: "low", format: zodOutputFormat(Reading) },
    });
    // 모델이 거절했거나 형식에 맞는 답을 못 냈으면 빈 결과.
    if (response.stop_reason === "refusal" || !response.parsed_output) return { ...EMPTY_READING };
    return normalizeReading(response.parsed_output);
  } catch (e) {
    // 글자 읽기가 안 돼도 바코드 결과는 돌려줘야 하므로 오류를 삼키고 기록만 남긴다.
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error("read-gifticon: API key rejected", e.status);
    } else if (e instanceof Anthropic.RateLimitError) {
      console.error("read-gifticon: rate limited");
    } else if (e instanceof Anthropic.APIError) {
      console.error("read-gifticon: API error", e.status, e.message);
    } else {
      console.error("read-gifticon: unexpected error", e);
    }
    return { ...EMPTY_READING };
  }
}

Deno.serve(handle(async (req) => {
  const userId = await requireUser(req);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") throw new HttpError(400, "BAD_REQUEST");
  // 자기 폴더에 올린 사진만 읽는다.
  const imagePath = requireOwnImagePath(b.image_path, userId);

  // 사용자 권한 그대로 내려받는다 (RLS: 자기 폴더의 사진만 읽을 수 있다).
  const storage = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from("gifticons");
  const file = await storage.download(imagePath);
  if (file.error || !file.data) throw new HttpError(404, "IMAGE_NOT_FOUND");
  const bytes = new Uint8Array(await file.data.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new HttpError(400, "IMAGE_TOO_LARGE");

  // 1) 바코드 해독. 사진을 풀다가 실패해도(깨진 파일 등) 나머지는 계속한다.
  let barcode = null;
  try {
    barcode = findBarcode(bytes);
  } catch (e) {
    console.error("read-gifticon: barcode scan failed", e);
  }

  // 2) 글자 읽기 (선택)
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const ai = !!apiKey && bytes.length <= MAX_AI_IMAGE_BYTES;
  const fields = ai ? await readWithClaude(apiKey, bytes) : { ...EMPTY_READING };

  // 바코드 번호는 눈으로 읽은 글자보다 해독한 값이 정확하므로 해독한 값을 우선한다.
  const scanned = barcode ? barcodeNumberFromScan(barcode.text) : null;
  if (scanned) fields.barcode_number = scanned;

  return json({
    fields,
    // 바코드 막대의 윗변이 사진 높이의 어디쯤인지 (0~1). 바코드를 못 찾았으면 null.
    barcode_top: barcode ? barcode.box.top / barcode.height : null,
    // 글자 읽기(Claude)를 했는지. false면 앱은 바코드 번호 말고는 직접 입력하라고 안내한다.
    ai,
  });
}));
