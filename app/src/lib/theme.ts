// 디자인 토큰. 색 hex 리터럴은 이 파일에만 둔다 (theme.test.ts가 검사한다).
// 스펙: docs/superpowers/specs/2026-11-07-design-indigo-design.md

export const colors = {
  primary: '#3B5BDB',
  primarySoft: '#EDF2FF',
  ink: '#212124',
  sub: '#868B94',
  faint: '#ADB1BA',
  line: '#F2F3F6',
  bg: '#FFFFFF',
  bg2: '#F7F8FA',
  danger: '#E03131',
  dangerSoft: '#FFF0F0',
  coatA: '#C9CCD3',
  coatB: '#BFC3CB',
  holdBg: '#FFF4D6',
  holdFg: '#9A6B00',
  okBg: '#E6F6EA',
  okFg: '#1E7B3A',
  mutedBg: '#F1F3F5',
} as const;

export const type = {
  screenTitle: { fontSize: 20, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  price: { fontSize: 15, fontWeight: '700' },
  priceBig: { fontSize: 20, fontWeight: '800' },
  meta: { fontSize: 12, color: colors.sub },
  body: { fontSize: 14 },
  button: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.sub },
} as const;

export const radius = { sm: 8, md: 12, pill: 20, fab: 24 } as const;

export const space = { screen: 16, row: 14, gap: 12 } as const;
