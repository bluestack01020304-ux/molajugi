// 기프티콘 사진에서 바코드를 찾아 번호와 위치를 알아낸다. AI 없이 바코드 무늬 자체를 해독한다(ZXing).
// 번호는 폼의 바코드 칸을 채우는 데, 위치는 "보여주는 사진"을 바코드 위까지만 자르도록 제안하는 데 쓴다.
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "npm:@zxing/library@0.21";
import jpeg from "npm:jpeg-js@0.4";
import UPNG from "npm:upng-js@2";

export interface FoundBarcode {
  /** 바코드에 담긴 글자 (기프티콘은 대개 숫자). */
  text: string;
  /** 사진의 크기(px). */
  width: number;
  height: number;
  /** 바코드 막대가 차지하는 영역(px). */
  box: { left: number; top: number; right: number; bottom: number };
}

// 기프티콘에 쓰이는 1차원 바코드들. QR 등 2차원 코드는 번호가 아니라 주소가 담기는 경우가 많아 뺀다.
const FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
];

// 너무 큰 사진은 풀어 놓으면 메모리를 많이 써서 다루지 않는다 (가로×세로 픽셀 수).
const MAX_PIXELS = 30_000_000;

/** JPEG/PNG 파일 내용을 밝기(0~255) 배열로 푼다. 다른 형식이거나 너무 크면 null. */
function toLuminance(bytes: Uint8Array): { lum: Uint8ClampedArray; width: number; height: number } | null {
  let rgba: Uint8Array;
  let width: number;
  let height: number;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const img = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    if (img.width * img.height > MAX_PIXELS) return null;
    rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
    ({ width, height } = img);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const img = jpeg.decode(bytes, { useTArray: true, maxResolutionInMP: MAX_PIXELS / 1_000_000, maxMemoryUsageInMB: 512 });
    rgba = img.data;
    ({ width, height } = img);
  } else {
    return null;
  }
  const lum = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    // 투명한 부분은 흰 바탕으로 본다.
    const a = rgba[p + 3] / 255;
    const y = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
    lum[i] = y * a + 255 * (1 - a);
  }
  return { lum, width, height };
}

/**
 * 해독기가 알려 준 한 줄(y0, x1~x2)을 기준으로 바코드 막대가 위아래로 어디까지 이어지는지 찾는다.
 * 1차원 바코드는 같은 무늬가 세로로 반복되므로, 기준 줄과 무늬가 같은 줄이 끝나는 곳이 막대의 끝이다.
 */
function verticalExtent(lum: Uint8ClampedArray, width: number, height: number, y0: number, x1: number, x2: number) {
  let lo = 255;
  let hi = 0;
  for (let x = x1; x <= x2; x++) {
    const v = lum[y0 * width + x];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const threshold = (lo + hi) / 2;
  const sameAsReference = (y: number) => {
    let same = 0;
    for (let x = x1; x <= x2; x++) {
      if ((lum[y * width + x] < threshold) === (lum[y0 * width + x] < threshold)) same++;
    }
    return same / (x2 - x1 + 1) >= 0.85;
  };
  const scan = (step: 1 | -1) => {
    let edge = y0;
    let misses = 0;
    for (let y = y0 + step; y >= 0 && y < height; y += step) {
      if (sameAsReference(y)) {
        edge = y;
        misses = 0;
      } else if (++misses > 2) {
        break; // 잡음 한두 줄은 건너뛰고, 그 이상 다르면 막대가 끝난 것
      }
    }
    return edge;
  };
  return { top: scan(-1), bottom: scan(1) };
}

/** 사진에서 바코드 하나를 찾는다. 없거나 해독하지 못하면 null. */
export function findBarcode(bytes: Uint8Array): FoundBarcode | null {
  const image = toLuminance(bytes);
  if (!image) return null;
  const { lum, width, height } = image;

  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, FORMATS],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  let result;
  try {
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height)));
    result = new MultiFormatReader().decode(bitmap, hints);
  } catch {
    return null; // 바코드를 찾지 못함
  }
  const points = result.getResultPoints();
  if (!points || points.length < 2) return null;
  const xs = points.map((p) => p.getX());
  const left = Math.max(0, Math.floor(Math.min(...xs)));
  const right = Math.min(width - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.min(height - 1, Math.max(0, Math.round(points.reduce((s, p) => s + p.getY(), 0) / points.length)));
  if (right - left < 8) return null;

  const { top, bottom } = verticalExtent(lum, width, height, y0, left, right);
  return { text: result.getText(), width, height, box: { left, top, right, bottom } };
}
