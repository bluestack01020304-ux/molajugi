import { frameLayout } from '../frame';

test('phones and native apps fill the whole window', () => {
  expect(frameLayout(390, 844, true)).toEqual({
    framed: false,
    width: 390,
    height: 844,
    floating: false,
    showBrand: false,
  });
  expect(frameLayout(1536, 735, false).framed).toBe(false);
});

test('a wide web window gets a phone-sized frame', () => {
  expect(frameLayout(1536, 900, true)).toEqual({
    framed: true,
    width: 440,
    height: 852,
    floating: true,
    showBrand: true,
  });
});

test('a short window keeps the full height and a narrow one hides the brand panel', () => {
  const short = frameLayout(1536, 600, true);
  expect([short.height, short.floating]).toEqual([600, false]);
  expect(frameLayout(800, 900, true).showBrand).toBe(false);
});
