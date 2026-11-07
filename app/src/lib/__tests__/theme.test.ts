import { colors, radius, space, type } from '../theme';

test('primary is indigo and karrot orange is gone', () => {
  expect(colors.primary).toBe('#3B5BDB');
  expect(Object.values(colors)).not.toContain('#e8531f');
});

test('tokens carry the spec values', () => {
  expect(colors.ink).toBe('#212124');
  expect(colors.sub).toBe('#868B94');
  expect(colors.line).toBe('#F2F3F6');
  expect(radius).toEqual({ sm: 8, md: 12, pill: 20, fab: 24 });
  expect(space.screen).toBe(16);
  expect(type.priceBig).toEqual({ fontSize: 20, fontWeight: '800' });
});
