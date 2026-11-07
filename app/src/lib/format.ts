import type { Category, Probability } from './database.types';

export function formatPoints(n: number): string {
  return `${n.toLocaleString('en-US')}P`;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString('en-US')}원`;
}

/** 오늘 날짜(KST)를 YYYY-MM-DD로 반환 */
export function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function daysLeftLabel(expiresOn: string, today: string = todayKst()): string {
  const diff = Math.round((Date.parse(expiresOn) - Date.parse(today)) / 86_400_000);
  if (diff > 0) return `${diff}일 남음`;
  if (diff === 0) return '오늘까지';
  return '만료';
}

export const CATEGORIES: readonly Category[] = [
  'cafe',
  'convenience',
  'chicken_pizza',
  'bakery',
  'dining',
  'etc',
];

/** DB의 category(string)를 Category로 좁힌다. 모르는 값은 'etc'. */
export function asCategory(s: string): Category {
  return (CATEGORIES as readonly string[]).includes(s) ? (s as Category) : 'etc';
}

export const CATEGORY_LABELS: Record<Category, string> = {
  cafe: '카페',
  convenience: '편의점',
  chicken_pizza: '치킨·피자',
  bakery: '베이커리·디저트',
  dining: '외식',
  etc: '기타',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  cafe: '☕',
  convenience: '🏪',
  chicken_pizza: '🍗',
  bakery: '🥐',
  dining: '🍽️',
  etc: '🎁',
};

/** 서버 calcPrice와 같은 식. 화면 표시 전용이며 실제 가격은 서버가 계산한다. */
export function previewPrice(faceValue: number, probability: Probability): number {
  return Math.round((faceValue * probability) / 100 / 10) * 10;
}
