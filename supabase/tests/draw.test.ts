import { assertEquals } from "@std/assert";
import { callFn, createUser, insertListing, kstDateOffset, setBalance, sql } from "./helpers.ts";

const roll = (v: number) => ({ "x-debug-roll": String(v) });

async function setup() {
  const s = await createUser("s");
  const b = await createUser("b");
  await setBalance(b.id, 5000);
  const id = await insertListing(s.id, {});
  return { s, b, id };
}

Deno.test("draw miss: buyer pays, seller credited net, listing stays active", async () => {
  const { s, b, id } = await setup();
  const r = await callFn("draw", b.jwt, { listing_id: id }, roll(0.9));
  assertEquals([r.status, r.json.result, r.json.balance], [200, "miss", 4000]);
  const [l] = await sql`select status, miss_count from listings where id=${id}`;
  assertEquals([l.status, l.miss_count], ["active", 1]);
  const [w] = await sql`select balance from wallets where user_id=${s.id}`;
  assertEquals(w.balance, 900);
  const [st] = await sql`select status, gross, fee, net from settlements where draw_id=${r.json.draw_id}`;
  assertEquals([st.status, st.gross, st.fee, st.net], ["completed", 1000, 100, 900]);
});

Deno.test("draw win: listing won, settlement held for 3 days, seller not yet paid", async () => {
  const { s, b, id } = await setup();
  const r = await callFn("draw", b.jwt, { listing_id: id }, roll(0.1));
  assertEquals(r.json.result, "win");
  const [l] = await sql`select status from listings where id=${id}`;
  assertEquals(l.status, "won");
  const [st] = await sql`select status, extract(epoch from (release_at - created_at)) as secs from settlements where draw_id=${r.json.draw_id}`;
  assertEquals([st.status, Number(st.secs)], ["held", 3 * 86400]);
  const [w] = await sql`select balance from wallets where user_id=${s.id}`;
  assertEquals(w.balance, 0);
  const [n] = await sql`select kind from notifications where user_id=${s.id}`;
  assertEquals(n.kind, "draw_win");
});

Deno.test("draw_insufficient_balance_changes_nothing", async () => {
  const { b, id } = await setup();
  await setBalance(b.id, 500);
  const r = await callFn("draw", b.jwt, { listing_id: id }, roll(0.1));
  assertEquals([r.status, r.json.error], [402, "INSUFFICIENT_BALANCE"]);
  assertEquals((await sql`select count(*)::int as c from draws where buyer_id=${b.id}`)[0].c, 0);
  assertEquals((await sql`select balance from wallets where user_id=${b.id}`)[0].balance, 500);
});

Deno.test("draw rejects own listing and withdrawn listing", async () => {
  const { s, b, id } = await setup();
  assertEquals((await callFn("draw", s.jwt, { listing_id: id })).json.error, "OWN_LISTING");
  await sql`update listings set status='withdrawn' where id=${id}`;
  assertEquals((await callFn("draw", b.jwt, { listing_id: id })).json.error, "LISTING_NOT_ACTIVE");
});

Deno.test("draw rejects listing expiring tomorrow", async () => {
  const { s, b } = await setup();
  const id2 = await insertListing(s.id, { expires_on: kstDateOffset(1) });
  assertEquals((await callFn("draw", b.jwt, { listing_id: id2 })).json.error, "LISTING_NOT_ACTIVE");
});

Deno.test("draw_concurrent_two_buyers_only_one_wins", async () => {
  const { b, id } = await setup();
  const b2 = await createUser("b2");
  await setBalance(b2.id, 5000);
  const [r1, r2] = await Promise.all([
    callFn("draw", b.jwt, { listing_id: id }, roll(0.1)),
    callFn("draw", b2.jwt, { listing_id: id }, roll(0.1)),
  ]);
  const results = [r1, r2].map((r) => r.json.result ?? r.json.error).sort();
  assertEquals(results, ["LISTING_NOT_ACTIVE", "win"]);
  assertEquals((await sql`select count(*)::int as c from draws where listing_id=${id}`)[0].c, 1);
});
