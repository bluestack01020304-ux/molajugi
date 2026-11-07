import { assertEquals, assert } from "@std/assert";
import { callFn, createUser, insertListing, kstDateOffset, setBalance, sql } from "./helpers.ts";

const callDaily = () => callFn("daily", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {});

async function makeWin() {
  const s = await createUser("s");
  const b = await createUser("b");
  await setBalance(b.id, 5000);
  const id = await insertListing(s.id, {});
  const r = await callFn("draw", b.jwt, { listing_id: id }, { "x-debug-roll": "0.1" });
  return { s, b, draw_id: r.json.draw_id as string };
}

Deno.test("daily notices at 7 and 1 days, delists at 1 day", async () => {
  const s = await createUser("s");
  await insertListing(s.id, { expires_on: kstDateOffset(7) });
  const one = await insertListing(s.id, { expires_on: kstDateOffset(1) });
  const far = await insertListing(s.id, { expires_on: kstDateOffset(10) });
  const r = await callDaily();
  assertEquals(r.status, 200);
  const kinds = (await sql`select kind from notifications where user_id=${s.id} order by kind`).map((x) => x.kind);
  assertEquals(kinds, ["expiry_notice", "listing_expired"]);
  assertEquals((await sql`select status from listings where id=${one}`)[0].status, "expired");
  assertEquals((await sql`select status from listings where id=${far}`)[0].status, "active");
});

Deno.test("daily auto-releases held settlements past release_at", async () => {
  const { s, draw_id } = await makeWin();
  await sql`update settlements set release_at = now() - interval '1 hour' where draw_id = ${draw_id}`;
  const r = await callDaily();
  assert(r.json.released >= 1); // daily is global; other rows may be swept too
  assertEquals((await sql`select status from settlements where draw_id=${draw_id}`)[0].status, "auto_released");
  assertEquals((await sql`select balance from wallets where user_id=${s.id}`)[0].balance, 900);
  assertEquals((await sql`select count(*)::int as n from wallet_transactions where user_id=${s.id} and kind='settlement'`)[0].n, 1);
  assertEquals((await sql`select count(*)::int as n from notifications where user_id=${s.id} and kind='settle_auto'`)[0].n, 1);
  await callDaily();
  assertEquals((await sql`select balance from wallets where user_id=${s.id}`)[0].balance, 900);
});

Deno.test("daily_skips_disputed_settlements", async () => {
  const { s, b, draw_id } = await makeWin();
  await callFn("settle", b.jwt, { draw_id, action: "report" });
  await sql`update settlements set release_at = now() - interval '1 hour' where draw_id = ${draw_id}`;
  await callDaily();
  assertEquals((await sql`select status from settlements where draw_id=${draw_id}`)[0].status, "disputed");
  assertEquals((await sql`select balance from wallets where user_id=${s.id}`)[0].balance, 0);
});

Deno.test("daily rejects user jwt", async () => {
  const u = await createUser("u");
  assertEquals((await callFn("daily", u.jwt, {})).status, 401);
});
