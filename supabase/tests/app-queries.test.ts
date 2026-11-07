// 앱(app/src/lib/api.ts, hooks)이 하는 읽기/쓰기를 "그 화면을 쓰는 역할"의 supabase-js 클라이언트로 그대로 재현한다.
// RLS 정책이 빠지면 빈 결과가 나오므로, 모든 테스트는 비어 있지 않은 기대값을 단언한다.
import { assert, assertEquals } from "@std/assert";
import { callFn, createUser, insertListing, kstDateOffset, setBalance, sql } from "./helpers.ts";

// app/src/lib/format.ts MIN_DRAWABLE_DAYS와 같은 값.
const MIN_DRAWABLE_DAYS = 2;

/** 판매자 s, 구매자 b. 매물 하나를 b가 당첨(디버그 롤)으로 가져간다. 이미지도 실제로 올린다. */
async function setupWin() {
  const s = await createUser("s");
  const b = await createUser("b");
  await setBalance(b.id, 5000);
  const id = await insertListing(s.id, {});
  const path = `${s.id}/${crypto.randomUUID()}.jpg`;
  const up = await s.client.storage.from("gifticons")
    .upload(path, new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), { contentType: "image/jpeg" });
  assertEquals(up.error, null);
  await sql`update listing_secrets set image_path = ${path} where listing_id = ${id}`;
  const r = await callFn("draw", b.jwt, { listing_id: id }, { "x-debug-roll": "0.1" });
  assertEquals(r.json.result, "win");
  return { s, b, id, path, drawId: r.json.draw_id as string };
}

Deno.test("app: active list (fetchActiveListings) as a buyer", async () => {
  const s = await createUser("s");
  const b = await createUser("b");
  const tooSoon = await insertListing(s.id, { expires_on: kstDateOffset(1) });
  const edge = await insertListing(s.id, { expires_on: kstDateOffset(MIN_DRAWABLE_DAYS) });
  const far = await insertListing(s.id, { expires_on: kstDateOffset(40) });
  const withdrawn = await insertListing(s.id, { status: "withdrawn" });
  const { data, error } = await b.client.from("listings").select("*").eq("status", "active")
    .gte("expires_on", kstDateOffset(MIN_DRAWABLE_DAYS)).order("expires_on", { ascending: true });
  assertEquals(error, null);
  const ids = data!.map((l) => l.id);
  assert(ids.includes(edge) && ids.includes(far));
  assert(ids.indexOf(edge) < ids.indexOf(far), "expires_on 오름차순");
  assert(!ids.includes(tooSoon) && !ids.includes(withdrawn));
  // 카테고리 필터
  const cafe = await b.client.from("listings").select("id").eq("status", "active").eq("category", "cafe").eq("id", far);
  assertEquals(cafe.data!.length, 1);
});

Deno.test("app: listing detail by id (fetchListing) as a buyer", async () => {
  const s = await createUser("s");
  const b = await createUser("b");
  const id = await insertListing(s.id, { price: 1000 });
  const { data, error } = await b.client.from("listings").select("*").eq("id", id).maybeSingle();
  assertEquals(error, null);
  assertEquals([data!.id, data!.price, data!.status], [id, 1000, "active"]);
});

Deno.test("app: my wins with listings + settlements (fetchMyWins) as the buyer", async () => {
  const { b, id, drawId } = await setupWin();
  const draws = await b.client.from("draws").select("*").eq("buyer_id", b.id).eq("result", "win")
    .order("created_at", { ascending: false });
  assertEquals(draws.data!.map((d) => d.id), [drawId]);
  const [l, st] = await Promise.all([
    b.client.from("listings").select("*").in("id", [id]),
    b.client.from("settlements").select("*").in("draw_id", [drawId]),
  ]);
  assertEquals(l.data!.map((x) => [x.id, x.status]), [[id, "won"]]);
  assertEquals(st.data!.map((x) => [x.draw_id, x.status, x.net]), [[drawId, "held", 900]]);
});

Deno.test("app: win detail with secret + signed image URL (fetchWinDetail) as the winner", async () => {
  const { b, id, path, drawId } = await setupWin();
  const d = await b.client.from("draws").select("*").eq("id", drawId).maybeSingle();
  assertEquals(d.data!.listing_id, id);
  const [l, sec, st] = await Promise.all([
    b.client.from("listings").select("*").eq("id", id).maybeSingle(),
    b.client.from("listing_secrets").select("*").eq("listing_id", id).maybeSingle(),
    b.client.from("settlements").select("*").eq("draw_id", drawId).maybeSingle(),
  ]);
  assertEquals(l.data!.id, id);
  assertEquals([sec.data!.image_path, sec.data!.barcode_number], [path, "1234 5678"]);
  assertEquals(st.data!.status, "held");
  const url = await b.client.storage.from("gifticons").createSignedUrl(sec.data!.image_path, 600);
  assertEquals(url.error, null);
  assert(url.data!.signedUrl.length > 0);
});

Deno.test("app: my listings with draws + settlements (fetchMyListings) as the seller", async () => {
  const s = await createUser("s");
  const b = await createUser("b");
  await setBalance(b.id, 5000);
  const id = await insertListing(s.id, {});
  const miss = await callFn("draw", b.jwt, { listing_id: id }, { "x-debug-roll": "0.9" });
  assertEquals(miss.json.result, "miss");
  const listings = await s.client.from("listings").select("*").eq("seller_id", s.id)
    .order("created_at", { ascending: false });
  assertEquals(listings.data!.map((l) => [l.id, l.miss_count]), [[id, 1]]);
  const [d, st] = await Promise.all([
    s.client.from("draws").select("id, listing_id").in("listing_id", [id]), // 0004 정책
    s.client.from("settlements").select("draw_id, net, status, created_at").eq("seller_id", s.id),
  ]);
  assertEquals(d.data!.map((x) => [x.id, x.listing_id]), [[miss.json.draw_id, id]]);
  assertEquals(st.data!.map((x) => [x.draw_id, x.net, x.status]), [[miss.json.draw_id, 900, "completed"]]);
});

Deno.test("app: notifications select + mark read, unread count (profile, useUnreadCount)", async () => {
  const u = await createUser("u");
  await sql`insert into notifications (user_id, kind, title, body)
            values (${u.id}, 'k', 't1', 'b'), (${u.id}, 'k', 't2', 'b')`;
  const unread = await u.client.from("notifications").select("id", { count: "exact", head: true })
    .eq("user_id", u.id).eq("read", false);
  assertEquals(unread.count, 2);
  const list = await u.client.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  assertEquals(list.data!.length, 2);
  const upd = await u.client.from("notifications").update({ read: true })
    .eq("user_id", u.id).eq("read", false).select("id");
  assertEquals(upd.error, null);
  assertEquals(upd.data!.length, 2);
  const [{ n }] = await sql`select count(*)::int as n from notifications where user_id = ${u.id} and read = false`;
  assertEquals(n, 0);
});

Deno.test("app: profiles push_token update (savePushToken) and wallet read (useWallet)", async () => {
  const u = await createUser("u");
  const token = "ExponentPushToken[test]";
  const upd = await u.client.from("profiles").update({ push_token: token }).eq("id", u.id).select("push_token");
  assertEquals(upd.data, [{ push_token: token }]);
  const [p] = await sql`select push_token from profiles where id = ${u.id}`;
  assertEquals(p.push_token, token);
  await setBalance(u.id, 1234);
  const w = await u.client.from("wallets").select("balance").eq("user_id", u.id).maybeSingle();
  assertEquals(w.data, { balance: 1234 });
});

Deno.test("app: app_config select (useRules) as any signed-in user", async () => {
  const u = await createUser("u");
  const { data, error } = await u.client.from("app_config").select("key, value");
  assertEquals(error, null);
  const m = new Map(data!.map((r) => [r.key, r.value]));
  assertEquals(
    [m.get("probabilities"), m.get("fee_rate"), m.get("hold_days"), m.get("expiry_notice_days"),
      m.get("min_days_to_list"), m.get("topup_amount")],
    [[25, 50, 75], 0.1, 3, [7, 1], 2, 10000],
  );
});

Deno.test("app: withdraw active -> withdrawn (withdrawListing) as the seller", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id, {});
  const { data, error } = await s.client.from("listings").update({ status: "withdrawn" })
    .eq("id", id).eq("status", "active").select("id");
  assertEquals(error, null);
  assertEquals(data, [{ id }]);
  assertEquals((await sql`select status from listings where id = ${id}`)[0].status, "withdrawn");
});
