export const GRID = { cols: 10, rows: 14 } as const;

export function cellIndexAt(x: number, y: number, width: number, height: number): number | null {
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const col = Math.min(GRID.cols - 1, Math.floor(x / (width / GRID.cols)));
  const row = Math.min(GRID.rows - 1, Math.floor(y / (height / GRID.rows)));
  return row * GRID.cols + col;
}

export function isRevealComplete(revealed: number, total: number, threshold = 0.6): boolean {
  return revealed / total >= threshold;
}

const CARD_RATIO = 1.4; // 세로 ÷ 가로
const CARD_MAX_WIDTH = 420; // 컴퓨터처럼 넓은 창에서도 폰 크기를 넘지 않게
const CARD_MIN_WIDTH = 140;
const SIDE_MARGIN = 32; // 화면 좌우 여백 합
const RESERVED_HEIGHT = 290; // 헤더와, 결과가 나온 뒤 아래에 뜨는 문구·버튼이 쓰는 높이

/** 창 크기에 맞는 긁기 카드 크기. 폰에서는 가로를 꽉 채우고, 넓거나 낮은 창에서는 창 안에 들어오게 줄인다. */
export function cardSize(windowWidth: number, windowHeight: number): { width: number; height: number } {
  const byHeight = (windowHeight - RESERVED_HEIGHT) / CARD_RATIO;
  const width = Math.round(
    Math.max(CARD_MIN_WIDTH, Math.min(windowWidth - SIDE_MARGIN, CARD_MAX_WIDTH, byHeight)),
  );
  return { width, height: Math.round(width * CARD_RATIO) };
}
