import { assert, assertEquals } from "@std/assert";
import { asPng, makeGifticon } from "./barcode.test.ts";
import { callFn, createUser } from "./helpers.ts";

// read-gifticon 함수 전체 흐름. 글자 읽기(Claude 호출)는 ANTHROPIC_API_KEY가 있어야 하므로 여기서는
// 키 없이도 되는 부분(입구 검사, 바코드 해독)만 본다. 읽은 값을 다듬는 규칙은 gifticon-reading.test.ts.

Deno.test("read-gifticon rejects callers without a login and images outside their own folder", async () => {
  const anon = await callFn("read-gifticon", "not-a-jwt", { image_path: "x/y.jpg" });
  assertEquals(anon.status, 401);
  const u = await createUser("u");
  for (const p of [undefined, "other/x.jpg", `${u.id}/../x.jpg`, `${u.id}/x.txt`]) {
    const r = await callFn("read-gifticon", u.jwt, { image_path: p });
    assertEquals([r.status, r.json.error], [400, "BAD_REQUEST"], String(p));
  }
  const missing = await callFn("read-gifticon", u.jwt, { image_path: `${u.id}/missing.jpg` });
  assertEquals([missing.status, missing.json.error], [404, "IMAGE_NOT_FOUND"]);
});

Deno.test("read-gifticon decodes the barcode number and position without any AI", async () => {
  const u = await createUser("u");
  const { rgba, box } = await makeGifticon("940122335566", 560);
  const path = `${u.id}/${crypto.randomUUID()}.png`;
  const up = await u.client.storage.from("gifticons")
    .upload(path, new Blob([asPng(rgba)], { type: "image/png" }), { contentType: "image/png" });
  assertEquals(up.error, null);

  const r = await callFn("read-gifticon", u.jwt, { image_path: path });
  assertEquals(r.status, 200);
  assertEquals(r.json.fields.barcode_number, "9401 2233 5566");
  // 바코드 윗변의 위치(사진 높이 대비). 시험용 사진은 높이 900에 바코드가 560에서 시작한다.
  assert(Math.abs(r.json.barcode_top - box!.top / 900) < 0.01, `barcode_top ${r.json.barcode_top}`);
  if (!r.json.ai) {
    // 키가 없는 환경: 바코드 번호 말고는 비어 있어야 한다.
    assertEquals(
      [r.json.fields.brand, r.json.fields.product_name, r.json.fields.expires_on],
      [null, null, null],
    );
  }
});

Deno.test("read-gifticon still answers when the photo has no barcode", async () => {
  const u = await createUser("u");
  const { rgba } = await makeGifticon(null);
  const path = `${u.id}/${crypto.randomUUID()}.png`;
  await u.client.storage.from("gifticons")
    .upload(path, new Blob([asPng(rgba)], { type: "image/png" }), { contentType: "image/png" });
  const r = await callFn("read-gifticon", u.jwt, { image_path: path });
  assertEquals([r.status, r.json.barcode_top], [200, null]);
  if (!r.json.ai) assertEquals(r.json.fields.barcode_number, null);
});
