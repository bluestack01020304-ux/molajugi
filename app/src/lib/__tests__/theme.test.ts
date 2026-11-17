import * as fs from 'fs';
import * as path from 'path';

import { colors, radius, space, type } from '../theme';

function walk(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('no_hex_literals_outside_theme', () => {
  const root = path.join(__dirname, '..', '..'); // app/src
  const offenders = walk(root)
    .filter((p) => /\.tsx?$/.test(p))
    .filter((p) => !p.endsWith('theme.ts') && !p.includes('__tests__') && !p.endsWith('database.types.ts'))
    .filter((p) => /#[0-9a-fA-F]{6}\b/.test(fs.readFileSync(p, 'utf8')))
    .map((p) => path.relative(root, p));
  expect(offenders).toEqual([]);
});

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
