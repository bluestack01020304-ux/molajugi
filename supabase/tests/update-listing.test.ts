import { assertEquals } from "@std/assert";
import { callFn, createUser, insertListing, kstDateOffset, sql } from "./helpers.ts";

// insertListing 기본값: face_value 2000, probability 50, price 1000, expires_on +30일
const body = (id: string, o = {}) => ({
  id,
  category: "cafe",
  brand: "brand",
  product_name: "product",
  face_value: 2000,
  expires_on: kstDateOffset(30),
  probability: 50,
  barcode_number: "1234 5678",
  ...o,
});

Deno.test("update-listing changes info and recomputes price server-side", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id);
  const r = await callFn("update-listing", s.jwt, body(id, {
    category: "bakery", brand: "파리바게뜨", product_name: "케이크", face_value: 4500, probability: 25,
    expires_on: kstDateOffset(60), barcode_number: " 9999 0000 ", image_path: `${s.id}/new.jpg`,
  }));
  assertEquals([r.status, r.json.price], [200, 1130]);
  const [l] = await sql`
    select category, brand, product_name, face_value, probability, price, expires_on::text as expires_on
    from listings where id = ${id}`;
  assertEquals(l, {
    category: "bakery", brand: "파리바게뜨", product_name: "케이크", face_value: 4500, probability: 25,
    price: 1130, expires_on: kstDateOffset(60),
  });
  const [sec] = await sql`select image_path, barcode_number from listing_secrets where listing_id = ${id}`;
  assertEquals([sec.image_path, sec.barcode_number], [`${s.id}/new.jpg`, "9999 0000"]);
});

Deno.test("update-listing keeps the image when image_path is omitted and clears an empty barcode", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id);
  const r = await callFn("update-listing", s.jwt, body(id, { barcode_number: "" }));
  assertEquals(r.status, 200);
  const [sec] = await sql`select image_path, barcode_number from listing_secrets where listing_id = ${id}`;
  assertEquals([sec.image_path, sec.barcode_number], [`${s.id}/${id}.jpg`, null]);
});

Deno.test("update-listing rejects another seller's listing and unknown ids", async () => {
  const s = await createUser("s");
  const other = await createUser("s");
  const id = await insertListing(s.id);
  const r = await callFn("update-listing", other.jwt, body(id, { brand: "hijack" }));
  assertEquals([r.status, r.json.error], [404, "LISTING_NOT_FOUND"]);
  const [l] = await sql`select brand from listings where id = ${id}`;
  assertEquals(l.brand, "brand");
  const missing = await callFn("update-listing", s.jwt, body(crypto.randomUUID()));
  assertEquals([missing.status, missing.json.error], [404, "LISTING_NOT_FOUND"]);
});

Deno.test("update-listing rejects listings that are not active", async () => {
  const s = await createUser("s");
  for (const status of ["won", "withdrawn", "expired"]) {
    const id = await insertListing(s.id, { status });
    const r = await callFn("update-listing", s.jwt, body(id, { brand: "x" }));
    assertEquals([r.status, r.json.error], [409, "LISTING_NOT_ACTIVE"], status);
  }
});

Deno.test("update-listing locks face value, probability and expiry once someone has drawn", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id);
  await sql`update listings set miss_count = 1 where id = ${id}`;
  for (const change of [{ face_value: 3000 }, { probability: 75 }, { expires_on: kstDateOffset(40) }]) {
    const r = await callFn("update-listing", s.jwt, body(id, change));
    assertEquals([r.status, r.json.error], [409, "LISTING_LOCKED"], JSON.stringify(change));
  }
  // 조건이 그대로면 이름·바코드 같은 정보는 여전히 고칠 수 있다.
  const ok = await callFn("update-listing", s.jwt, body(id, { product_name: "오타 수정" }));
  assertEquals([ok.status, ok.json.price], [200, 1000]);
  const [l] = await sql`select product_name, face_value, probability, price from listings where id = ${id}`;
  assertEquals(l, { product_name: "오타 수정", face_value: 2000, probability: 50, price: 1000 });
});

Deno.test("update-listing validates expiry only when it changes", async () => {
  const s = await createUser("s");
  // 유효기간이 이미 가까운 매물도 날짜를 건드리지 않으면 이름은 고칠 수 있다.
  const id = await insertListing(s.id, { expires_on: kstDateOffset(1) });
  const same = await callFn("update-listing", s.jwt, body(id, { expires_on: kstDateOffset(1), brand: "x" }));
  assertEquals(same.status, 200);
  const sooner = await callFn("update-listing", s.jwt, body(id, { expires_on: kstDateOffset(0) }));
  assertEquals([sooner.status, sooner.json.error], [400, "EXPIRY_TOO_SOON"]);
});

Deno.test("update-listing rejects bad input", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id);
  const cases: [Record<string, unknown>, string][] = [
    [{ id: "not-a-uuid" }, "BAD_REQUEST"],
    [{ brand: "  " }, "BAD_REQUEST"],
    [{ category: "nope" }, "BAD_REQUEST"],
    [{ face_value: 10, probability: 25 }, "BAD_REQUEST"], // 가격이 0원으로 반올림됨
    [{ expires_on: "2026-02-30" }, "BAD_REQUEST"],
    [{ probability: 30 }, "INVALID_PROBABILITY"],
    [{ image_path: "other/x.jpg" }, "BAD_REQUEST"],
  ];
  for (const [change, code] of cases) {
    const r = await callFn("update-listing", s.jwt, body(id, change));
    assertEquals([r.status, r.json.error], [400, code], JSON.stringify(change));
  }
});

Deno.test("update-listing replaces the preview image only when a new one is sent", async () => {
  const s = await createUser("s");
  const id = await insertListing(s.id);
  await sql`update listings set preview_path = ${`${s.id}/old.jpg`} where id = ${id}`;
  assertEquals((await callFn("update-listing", s.jwt, body(id, { brand: "x" }))).status, 200);
  const [kept] = await sql`select preview_path from listings where id = ${id}`;
  assertEquals(kept.preview_path, `${s.id}/old.jpg`);
  assertEquals((await callFn("update-listing", s.jwt, body(id, { preview_path: `${s.id}/new.png` }))).status, 200);
  const [changed] = await sql`select preview_path from listings where id = ${id}`;
  assertEquals(changed.preview_path, `${s.id}/new.png`);
  const bad = await callFn("update-listing", s.jwt, body(id, { preview_path: "other/p.jpg" }));
  assertEquals([bad.status, bad.json.error], [400, "BAD_REQUEST"]);
});
