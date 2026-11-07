import { assertEquals, assertRejects } from "@std/assert";
import { createUser, kstDateOffset, sql } from "./helpers.ts";

Deno.test("app_config has the six rule keys", async () => {
  const rows = await sql`select key from app_config order by key`;
  assertEquals(rows.map(r => r.key), ["expiry_notice_days","fee_rate","hold_days","min_days_to_list","probabilities","topup_amount"]);
});
Deno.test("listing rejects probability outside presets", async () => {
  const u = await createUser("s");
  const err = await assertRejects(() => sql`insert into listings (seller_id, category, brand, product_name, face_value, expires_on, probability, price) values (${u.id}, 'cafe', 'b', 'p', 2000, ${kstDateOffset(30)}, 30, 600)`);
  assertEquals((err as { code?: string }).code, "23514");
});
Deno.test("new auth user gets profile and zero-balance wallet", async () => {
  const u = await createUser("w");
  const [w] = await sql`select balance from wallets where user_id = ${u.id}`;
  assertEquals(w.balance, 0);
  const [p] = await sql`select nickname from profiles where id = ${u.id}`;
  assertEquals(p.nickname.startsWith("w-"), true);
});

Deno.test({ name: "close db connection", sanitizeResources: false, sanitizeOps: false, fn: () => sql.end() });
