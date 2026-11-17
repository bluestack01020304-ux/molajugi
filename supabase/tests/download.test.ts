import { assert, assertEquals } from "@std/assert";
import { createUser, insertListing, sql } from "./helpers.ts";

// 당첨자가 기프티콘 사진을 내려받는 흐름 (app/src/lib/api.ts signedDownloadUrl).
// 뽑기 함수 없이 당첨 상태를 DB에 직접 만든다 (함수 서빙 모드와 무관하게 돌도록).
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

async function setupWon() {
  const seller = await createUser("s");
  const winner = await createUser("b");
  const stranger = await createUser("u");
  const id = await insertListing(seller.id, { status: "won" });
  const path = `${seller.id}/${crypto.randomUUID()}.jpg`;
  const up = await seller.client.storage.from("gifticons")
    .upload(path, new Blob([JPEG], { type: "image/jpeg" }), { contentType: "image/jpeg" });
  assertEquals(up.error, null);
  await sql`update listing_secrets set image_path = ${path} where listing_id = ${id}`;
  await sql`insert into draws (listing_id, buyer_id, amount, result) values (${id}, ${winner.id}, 1000, 'win')`;
  return { winner, stranger, path };
}

Deno.test("winner downloads the gifticon image as an attachment with a readable file name", async () => {
  const { winner, path } = await setupWon();
  const name = "몰아주기_스타벅스_아메리카노 T.jpg";
  const { data, error } = await winner.client.storage.from("gifticons")
    .createSignedUrl(path, 600, { download: name });
  assertEquals(error, null);
  const res = await fetch(data!.signedUrl);
  assertEquals(res.status, 200);
  // 브라우저가 화면에 띄우지 않고 파일로 저장하게 하는 헤더
  const disposition = res.headers.get("content-disposition") ?? "";
  assert(disposition.startsWith("attachment"), disposition);
  assert(decodeURIComponent(disposition).includes(name), disposition);
  assertEquals(new Uint8Array(await res.arrayBuffer()), JPEG);
});

Deno.test("someone who did not win cannot get a download link", async () => {
  const { stranger, path } = await setupWon();
  const { data, error } = await stranger.client.storage.from("gifticons")
    .createSignedUrl(path, 600, { download: "x.jpg" });
  assert(error, "a stranger must not get a signed URL");
  assertEquals(data, null);
});
