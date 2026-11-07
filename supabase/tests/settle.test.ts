import { assertEquals } from "@std/assert";
import { callFn, createUser, insertListing, setBalance, sql } from "./helpers.ts";

async function makeWin() {
  const s = await createUser("s");
  const b = await createUser("b");
  await setBalance(b.id, 5000);
  const id = await insertListing(s.id, {});
  const r = await callFn("draw", b.jwt, { listing_id: id }, { "x-debug-roll": "0.1" });
  return { s, b, draw_id: r.json.draw_id as string };
}

Deno.test("settle confirm credits seller once", async () => {
  const { s, b, draw_id } = await makeWin();
  const r = await callFn("settle", b.jwt, { draw_id, action: "confirm" });
  assertEquals([r.status, r.json.status], [200, "confirmed"]);
  assertEquals((await sql`select balance from wallets where user_id=${s.id}`)[0].balance, 900);
  const tx = await sql`select amount, kind, ref_id from wallet_transactions where user_id=${s.id}`;
  assertEquals(tx.map((t) => [t.amount, t.kind, t.ref_id]), [[900, "settlement", draw_id]]);
});

Deno.test("settle_confirm_twice_credits_once", async () => {
  const { s, b, draw_id } = await makeWin();
  await callFn("settle", b.jwt, { draw_id, action: "confirm" });
  const r = await callFn("settle", b.jwt, { draw_id, action: "confirm" });
  assertEquals([r.status, r.json.error], [409, "SETTLEMENT_NOT_HELD"]);
  assertEquals((await sql`select balance from wallets where user_id=${s.id}`)[0].balance, 900);
});

Deno.test("settle_report_after_confirm_rejected", async () => {
  const { b, draw_id } = await makeWin();
  await callFn("settle", b.jwt, { draw_id, action: "confirm" });
  assertEquals((await callFn("settle", b.jwt, { draw_id, action: "report" })).json.error, "SETTLEMENT_NOT_HELD");
});

Deno.test("settle report marks disputed without paying", async () => {
  const { s, b, draw_id } = await makeWin();
  const r = await callFn("settle", b.jwt, { draw_id, action: "report" });
  assertEquals(r.json.status, "disputed");
  assertEquals((await sql`select balance from wallets where user_id=${s.id}`)[0].balance, 0);
});

Deno.test("settle by non-buyer is 403", async () => {
  const { draw_id } = await makeWin();
  const x = await createUser("x");
  assertEquals((await callFn("settle", x.jwt, { draw_id, action: "confirm" })).json.error, "NOT_BUYER");
});
