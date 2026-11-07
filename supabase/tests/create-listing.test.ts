import { assertEquals } from "@std/assert";
import { callFn, createUser, kstDateOffset, sql } from "./helpers.ts";

const body = (uid: string, o = {}) => ({ category:"cafe", brand:"메가커피", product_name:"아이스 아메리카노", face_value:2000, expires_on:kstDateOffset(30), probability:50, image_path:`${uid}/x.jpg`, barcode_number:"9401 2233", ...o });
Deno.test("create-listing computes price server-side", async () => {
  const s = await createUser("s");
  const r = await callFn("create-listing", s.jwt, body(s.id, { face_value: 4500, probability: 25 }));
  assertEquals([r.status, r.json.price], [200, 1130]);
  const [sec] = await sql`select barcode_number from listing_secrets where listing_id=${r.json.id}`;
  assertEquals(sec.barcode_number, "9401 2233");
});
Deno.test("create-listing rejects expiry in 1 day", async () => {
  const s = await createUser("s");
  const r = await callFn("create-listing", s.jwt, body(s.id, { expires_on: kstDateOffset(1) }));
  assertEquals([r.status, r.json.error], [400, "EXPIRY_TOO_SOON"]);
});
Deno.test("create-listing rejects probability 30 and foreign image path", async () => {
  const s = await createUser("s");
  assertEquals((await callFn("create-listing", s.jwt, body(s.id, { probability: 30 }))).json.error, "INVALID_PROBABILITY");
  assertEquals((await callFn("create-listing", s.jwt, body(s.id, { image_path: "other/x.jpg" }))).json.error, "BAD_REQUEST");
});
Deno.test("create-listing rejects impossible calendar date", async () => {
  const s = await createUser("s");
  for (const d of ["2026-02-30", "2026-13-45"]) {
    const r = await callFn("create-listing", s.jwt, body(s.id, { expires_on: d }));
    assertEquals([r.status, r.json.error], [400, "BAD_REQUEST"]);
  }
});
Deno.test("create-listing rejects image_path escaping the user folder", async () => {
  const s = await createUser("s");
  for (const p of [`${s.id}/../other/x.jpg`, `${s.id}//x.jpg`, `${s.id}/x.txt`, `${s.id}/xjpg`, `${s.id}\\x.jpg`, `${s.id}/a/x.jpg`]) {
    const r = await callFn("create-listing", s.jwt, body(s.id, { image_path: p }));
    assertEquals([r.status, r.json.error], [400, "BAD_REQUEST"], p);
  }
});
Deno.test("create-listing rejects face_value whose price rounds to 0 or exceeds the cap", async () => {
  const s = await createUser("s");
  // 10 × 25% = 2.5원 → 10원 단위 반올림 0원
  const tiny = await callFn("create-listing", s.jwt, body(s.id, { face_value: 10, probability: 25 }));
  assertEquals([tiny.status, tiny.json.error], [400, "BAD_REQUEST"]);
  const huge = await callFn("create-listing", s.jwt, body(s.id, { face_value: 2_000_000_001 }));
  assertEquals([huge.status, huge.json.error], [400, "BAD_REQUEST"]);
});
