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
  const b = await createUser("b"); const s = await createUser("s");
  const id = await insertListing(s.id, {});
  const r = await b.client.from("wallet_transactions").insert({ user_id: b.id, amount: 99999, kind: "topup" });
  assertEquals(r.error?.code, "42501");
  const w = await b.client.from("wallets").insert({ user_id: b.id, balance: 99999 });
  assertEquals(w.error?.code, "42501");
  const d = await b.client.from("draws").insert({ listing_id: id, buyer_id: b.id, amount: 1000, result: "win" });
  assertEquals(d.error?.code, "42501");
  const st = await b.client.from("settlements").insert({ seller_id: s.id, buyer_id: b.id, gross: 1, fee: 0, net: 1, status: "completed" });
  assertEquals(st.error?.code, "42501");
});
Deno.test("seller cannot change other columns while withdrawing", async () => {
  const s = await createUser("s"); const v = await createUser("v");
  const id = await insertListing(s.id, {});
  const r = await s.client.from("listings").update({ status: "withdrawn", price: 1 }).eq("id", id).select();
  assertEquals(r.error?.code, "42501");
  const r2 = await s.client.from("listings").update({ seller_id: v.id }).eq("id", id).select();
  assertEquals(r2.error?.code, "42501");
  const [row] = await sql`select status, price, seller_id from listings where id = ${id}`;
  assertEquals([row.status, row.price, row.seller_id], ["active", 1000, s.id]);
});
Deno.test("cross-user update of profiles and notifications is denied", async () => {
  const a = await createUser("a"); const b = await createUser("b");
  const p = await b.client.from("profiles").update({ nickname: "hacked" }).eq("id", a.id).select();
  assertEquals(p.data, []);
  const [n] = await sql`insert into notifications (user_id, kind, title, body) values (${a.id}, 'k', 't', 'b') returning id`;
  const u = await b.client.from("notifications").update({ read: true }).eq("id", n.id).select();
  assertEquals(u.data, []);
  const [after] = await sql`select read from notifications where id = ${n.id}`;
  assertEquals(after.read, false);
  const [pr] = await sql`select nickname from profiles where id = ${a.id}`;
  assertEquals(pr.nickname.startsWith("a-"), true);
});
Deno.test("seller still sees secrets of a withdrawn listing", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id, { status: "withdrawn" });
  const { data } = await s.client.from("listing_secrets").select("*").eq("listing_id", id);
  assertEquals(data!.length, 1);
});
Deno.test("non-winner cannot read a non-active listing", async () => {
  const s = await createUser("s"); const x = await createUser("x");
  const id = await insertListing(s.id, { status: "withdrawn" });
  const { data } = await x.client.from("listings").select("*").eq("id", id);
  assertEquals(data, []);
});
Deno.test("storage: folder ownership and winner access", async () => {
  const s = await createUser("s"); const x = await createUser("x"); const w = await createUser("w");
  const blob = () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
  const id = crypto.randomUUID();
  const path = `${s.id}/${id}.jpg`;
  const foreign = await x.client.storage.from("gifticons").upload(`${s.id}/evil.jpg`, blob(), { contentType: "image/jpeg" });
  assert(foreign.error !== null);
  const own = await s.client.storage.from("gifticons").upload(path, blob(), { contentType: "image/jpeg" });
  assertEquals(own.error, null);
  const third = await x.client.storage.from("gifticons").createSignedUrl(path, 60);
  assert(third.error !== null);
  // 당첨 처리: listing(id 고정)과 secrets, 승리 draw를 SQL로 삽입.
  const lid = await insertListing(s.id, { status: "won" });
  await sql`update listing_secrets set image_path = ${path} where listing_id = ${lid}`;
  await sql`insert into draws (listing_id, buyer_id, amount, result) values (${lid}, ${w.id}, 1000, 'win')`;
  const win = await w.client.storage.from("gifticons").createSignedUrl(path, 60);
  assertEquals(win.error, null);
  assert(win.data!.signedUrl.length > 0);
  // 브리프의 select 정책은 폴더 일치 조건도 허용하므로 판매자는 당첨 후에도 객체를 읽을 수 있다.
  const seller = await s.client.storage.from("gifticons").createSignedUrl(path, 60);
  assertEquals(seller.error, null);
});
