import { assert, assertEquals } from "@std/assert";
import bwipjs from "npm:bwip-js@4";
import jpeg from "npm:jpeg-js@0.4";
import UPNG from "npm:upng-js@2";
import { findBarcode } from "../functions/_shared/barcode.ts";

// 기프티콘처럼 생긴 시험용 사진을 만든다: 흰 바탕 600×900, 위에 상품 그림(초록 네모),
// 가운데쯤(top 위치)에 진짜 Code128 바코드. 사진의 RGBA와 바코드가 놓인 위치를 돌려준다.
const W = 600;
const H = 900;
export async function makeGifticon(code: string | null, top = 560) {
  const rgba = new Uint8Array(W * H * 4).fill(255);
  const rect = (x0: number, y0: number, x1: number, y1: number, [r, g, b]: number[]) => {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) rgba.set([r, g, b, 255], (y * W + x) * 4);
    }
  };
  rect(40, 40, 560, 420, [0, 112, 74]);
  let box = null;
  if (code) {
    const png = await bwipjs.toBuffer({ bcid: "code128", text: code, scale: 3, height: 14, includetext: false });
    const bar = UPNG.decode(new Uint8Array(png).buffer);
    const pixels = new Uint8Array(UPNG.toRGBA8(bar)[0]);
    const left = Math.floor((W - bar.width) / 2);
    for (let y = 0; y < bar.height; y++) {
      for (let x = 0; x < bar.width; x++) {
        const s = (y * bar.width + x) * 4;
        // 바코드 PNG의 투명한 곳은 흰색으로 둔다.
        const v = pixels[s + 3] < 128 ? 255 : pixels[s];
        rgba.set([v, v, v, 255], ((top + y) * W + left + x) * 4);
      }
    }
    box = { left, top, right: left + bar.width - 1, bottom: top + bar.height - 1 };
  }
  return { rgba, box };
}
export const asPng = (rgba: Uint8Array) => new Uint8Array(UPNG.encode([rgba.buffer as ArrayBuffer], W, H, 0));
const asJpeg = (rgba: Uint8Array) => new Uint8Array(jpeg.encode({ data: rgba, width: W, height: H }, 90).data);

const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;

Deno.test("findBarcode reads the number and where the bars are in a PNG", async () => {
  const { rgba, box } = await makeGifticon("940122335566");
  const found = findBarcode(asPng(rgba));
  assert(found, "barcode should be found");
  assertEquals([found.text, found.width, found.height], ["940122335566", W, H]);
  // 막대의 위아래 끝을 몇 픽셀 안에서 맞혀야 자르기 제안에 쓸 수 있다.
  assert(near(found.box.top, box!.top, 4), `top ${found.box.top} vs ${box!.top}`);
  assert(near(found.box.bottom, box!.bottom, 4), `bottom ${found.box.bottom} vs ${box!.bottom}`);
  assert(found.box.left >= box!.left - 4 && found.box.right <= box!.right + 4);
});

Deno.test("findBarcode also works on a JPEG, where edges are blurry", async () => {
  const { rgba, box } = await makeGifticon("7790012345678901", 470);
  const found = findBarcode(asJpeg(rgba));
  assert(found, "barcode should be found");
  assertEquals(found.text, "7790012345678901");
  assert(near(found.box.top, box!.top, 6), `top ${found.box.top} vs ${box!.top}`);
});

Deno.test("findBarcode returns null when there is no barcode or the file is not a photo", async () => {
  const { rgba } = await makeGifticon(null);
  assertEquals(findBarcode(asPng(rgba)), null);
  assertEquals(findBarcode(new TextEncoder().encode("File not found")), null);
  assertEquals(findBarcode(new Uint8Array()), null);
});
