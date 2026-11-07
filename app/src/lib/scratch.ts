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
