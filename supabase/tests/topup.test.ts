import { assertEquals } from "@std/assert";
import { callFn, createUser, sql } from "./helpers.ts";

Deno.test("topup adds configured amount and records transaction", async () => {
  const u = await createUser("t");
  const r = await callFn("topup", u.jwt, {});
  assertEquals(r.status, 200);
  assertEquals(r.json.balance, 10000);
  const [tx] = await sql`select amount, kind from wallet_transactions where user_id=${u.id}`;
  assertEquals([tx.amount, tx.kind], [10000, "topup"]);
});

Deno.test("topup without jwt is 401", async () => {
  const r = await callFn("topup", "bad", {});
  assertEquals([r.status, r.json.error], [401, "UNAUTHORIZED"]);
});
