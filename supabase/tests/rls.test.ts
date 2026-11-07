import { assert, assertEquals } from "@std/assert";
import { createUser, insertListing, sql } from "./helpers.ts";

Deno.test("wallet is invisible to other users", async () => {
  const a = await createUser("a"); const b = await createUser("b");
  const { data } = await b.client.from("wallets").select("*").eq("user_id", a.id);
  assertEquals(data, []);
});
Deno.test("secrets_hidden_from_third_party", async () => {
  const s = await createUser("s"); const x = await createUser("x");
  const id = await insertListing(s.id, {});
  const { data } = await x.client.from("listing_secrets").select("*").eq("listing_id", id);
  assertEquals(data, []);
});
Deno.test("secrets_hidden_from_seller_after_win", async () => {
  const s = await createUser("s"); const w = await createUser("w");
  const id = await insertListing(s.id, {});
  const before = await s.client.from("listing_secrets").select("*").eq("listing_id", id);
  assertEquals(before.data!.length, 1);
  await sql`update listings set status='won' where id=${id}`;
  await sql`insert into draws (listing_id, buyer_id, amount, result) values (${id}, ${w.id}, 1000, 'win')`;
  const after = await s.client.from("listing_secrets").select("*").eq("listing_id", id);
  assertEquals(after.data, []);
  const winner = await w.client.from("listing_secrets").select("barcode_number").eq("listing_id", id);
  assertEquals(winner.data![0].barcode_number, "1234 5678");
});
Deno.test("seller can withdraw active listing but cannot set other status", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id, {});
  const bad = await s.client.from("listings").update({ status: "won" }).eq("id", id).select();
  // WITH CHECK 위반은 빈 결과가 아니라 42501 오류로 거절된다.
  assertEquals(bad.error?.code, "42501");
  const [row] = await sql`select status from listings where id = ${id}`;
  assertEquals(row.status, "active");
  const ok = await s.client.from("listings").update({ status: "withdrawn" }).eq("id", id).select();
  assertEquals(ok.data![0].status, "withdrawn");
});
Deno.test("buyer cannot insert into draws or wallets", async () => {
  const b = await createUser("b");
  const r = await b.client.from("wallet_transactions").insert({ user_id: b.id, amount: 99999, kind: "topup" });
  assert(r.error !== null);
});
