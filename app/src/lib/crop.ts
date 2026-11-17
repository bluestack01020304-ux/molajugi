// 자르기 화면의 계산. 화면에 그려진 사진 위에서 자를 네모(Rect)를 움직이고, 마지막에 원본 픽셀 좌표로 바꾼다.

export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };
/** 네모의 어디를 잡았는지: 네 모서리, 네 변, 또는 안쪽(통째로 옮기기). */
export type Zone = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'move';

/** 네모의 최소 크기(화면 px). 이보다 작게는 줄어들지 않는다. */
export const MIN_CROP = 48;

/** 사진을 상자 안에 비율을 지켜 꽉 차게(contain) 그렸을 때의 크기. */
export function fitSize(image: Size, box: Size): Size {
  const scale = Math.min(box.width / image.width, box.height / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

// 바코드 윗변에서 이만큼(사진 높이 대비) 위에서 끊는다. 막대가 한 줄도 남지 않게 두는 여유.
const BARCODE_MARGIN = 0.02;
// 바코드가 사진 맨 위쪽에 있으면 그 위로는 남는 게 없으므로 제안하지 않는다.
const MIN_USEFUL_TOP = 0.15;

/**
 * 처음 보여 줄 네모.
 * - 바코드 위치를 알면(barcodeTop: 바코드 윗변의 높이 비율 0~1) 사진 맨 위부터 바코드 바로 위까지.
 * - 모르면 사진의 위쪽 60%. 기프티콘은 바코드가 대개 아래쪽에 있다.
 */
export function initialCrop(shown: Size, barcodeTop: number | null = null): Rect {
  const fraction =
    barcodeTop !== null && barcodeTop >= MIN_USEFUL_TOP ? barcodeTop - BARCODE_MARGIN : 0.6;
  return { x: 0, y: 0, width: shown.width, height: Math.max(MIN_CROP, shown.height * fraction) };
}

/** (x, y)를 눌렀을 때 네모의 어느 부분을 잡은 것인지. slop은 모서리·변을 잡은 것으로 쳐 주는 거리. */
export function zoneAt(rect: Rect, x: number, y: number, slop = 28): Zone {
  const nearL = Math.abs(x - rect.x) <= slop;
  const nearR = Math.abs(x - (rect.x + rect.width)) <= slop;
  const nearT = Math.abs(y - rect.y) <= slop;
  const nearB = Math.abs(y - (rect.y + rect.height)) <= slop;
  if (nearT && nearL) return 'tl';
  if (nearT && nearR) return 'tr';
  if (nearB && nearL) return 'bl';
  if (nearB && nearR) return 'br';
  if (nearT) return 't';
  if (nearB) return 'b';
  if (nearL) return 'l';
  if (nearR) return 'r';
  return 'move';
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** 잡기 시작할 때의 네모(start)를 zone 기준으로 (dx, dy)만큼 끌었을 때의 네모. 사진 밖으로 나가지 않는다. */
export function dragRect(start: Rect, zone: Zone, dx: number, dy: number, bounds: Size): Rect {
  if (zone === 'move') {
    return {
      ...start,
      x: clamp(start.x + dx, 0, bounds.width - start.width),
      y: clamp(start.y + dy, 0, bounds.height - start.height),
    };
  }
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;
  if (zone.includes('l')) left = clamp(left + dx, 0, right - MIN_CROP);
  if (zone.includes('r')) right = clamp(right + dx, left + MIN_CROP, bounds.width);
  if (zone.includes('t')) top = clamp(top + dy, 0, bottom - MIN_CROP);
  if (zone.includes('b')) bottom = clamp(bottom + dy, top + MIN_CROP, bounds.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** 화면 위의 네모를 원본 사진의 픽셀 좌표(정수)로 바꾼다. */
export function toPixelCrop(
  rect: Rect,
  shown: Size,
  image: Size,
): { originX: number; originY: number; width: number; height: number } {
  const sx = image.width / shown.width;
  const sy = image.height / shown.height;
  const originX = clamp(Math.round(rect.x * sx), 0, image.width - 1);
  const originY = clamp(Math.round(rect.y * sy), 0, image.height - 1);
  return {
    originX,
    originY,
    width: clamp(Math.round(rect.width * sx), 1, image.width - originX),
    height: clamp(Math.round(rect.height * sy), 1, image.height - originY),
  };
}
