// 샘플 데이터: deno run -A --env-file=.env.test tests/seed.ts
// 멱등: 판매자(seller@test.local)에게 매물이 하나라도 있으면 매물 생성은 건너뛴다. 처음부터 다시 하려면 `db reset`.
import { createClient } from "@supabase/supabase-js";
import { calcPrice, type Probability } from "../functions/_shared/rules.ts";
import { ensureUser, kstDateOffset, sql, withdrawTestListings } from "./helpers.ts";

// 1×1 투명 PNG
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

const seller = await ensureUser("seller@test.local");
const buyer = await ensureUser("buyer@test.local");
await sql`update wallets set balance = 20000 where user_id in (${seller.id}, ${buyer.id})`;

type Seed = [string, string, string, number, Probability, number, string];
const seeds: Seed[] = [
  ["cafe", "스타벅스", "아메리카노 T", 4500, 50, 5, "9401 2233 8871 0045"],
  ["convenience", "GS25", "모바일상품권 2천원", 2000, 75, 12, "9402 1180 4472 3391"],
  ["chicken_pizza", "BBQ", "황금올리브", 22000, 25, 30, "9403 5521 0098 7712"],
  ["bakery", "파리바게뜨", "케이크 교환권", 6500, 50, 8, "9404 7766 3310 2284"],
  ["dining", "아웃백", "2인 식사권", 15000, 25, 40, "9405 3349 6620 1157"],
  ["etc", "올리브영", "기프트카드", 10000, 75, 20, "9406 8812 5503 9960"],
];

const [{ n }] = await sql`select count(*)::int as n from listings where seller_id = ${seller.id}`;
if (n > 0) {
  console.log(`seller already has ${n} listings; skipping listing creation (run db reset to start over)`);
} else {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const [i, [category, brand, product, face, prob, days, barcode]] of seeds.entries()) {
    const path = `${seller.id}/seed-${i + 1}.png`;
    const { error } = await admin.storage.from("gifticons").upload(path, PNG, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) throw error;
    const [row] = await sql`
      insert into listings (seller_id, category, brand, product_name, face_value, expires_on, probability, price, status)
      values (${seller.id}, ${category}, ${brand}, ${product}, ${face}, ${kstDateOffset(days)}, ${prob},
              ${calcPrice(face, prob)}, 'active')
      returning id`;
    await sql`insert into listing_secrets (listing_id, image_path, barcode_number)
              values (${row.id}, ${path}, ${barcode})`;
  }
}

const swept = await withdrawTestListings();
if (swept > 0) console.log(`테스트가 남긴 매물 ${swept}건을 내렸다`);

const rows = await sql`
  select category, brand, product_name, face_value, probability, price, expires_on::text as expires_on
  from listings where seller_id = ${seller.id} and status = 'active' order by face_value`;
console.log("accounts: seller@test.local / buyer@test.local (password test1234, balance 20000)");
console.table(rows);
await sql.end({ timeout: 5 });
