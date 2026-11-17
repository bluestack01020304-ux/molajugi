import { act } from 'react';
import { Text } from 'react-native';
import { create, type ReactTestRenderer } from 'react-test-renderer';

import { ListingRow } from '../ListingRow';

const base = {
  id: '1',
  seller_id: 's',
  category: 'cafe',
  brand: '스타벅스',
  product_name: '아메리카노 T',
  face_value: 4500,
  expires_on: '2099-01-01',
  probability: 50,
  price: 2250,
  status: 'active',
  miss_count: 0,
  created_at: '',
} as any;

async function render(listing: any): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<ListingRow listing={listing} onPress={() => {}} />);
  });
  return r;
}

function textOf(n: any): string {
  return Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children);
}

test('listing_row_shows_probability_price_and_struck_face', async () => {
  const r = await render(base);
  const text = r.root.findAllByType(Text as any).map(textOf).join(' ');
  expect(text).toMatch(/50%/);
  expect(text).toMatch(/2,250원/);
  expect(text).toMatch(/4,500원/);
  const struck = r.root.findAll(
    (n: any) =>
      n.type === Text &&
      textOf(n).includes('4,500원') &&
      JSON.stringify(n.props.style).includes('line-through'),
  );
  expect(struck.length).toBe(1);
});

test('listing_row_truncates_long_title', async () => {
  const r = await render({ ...base, product_name: 'x'.repeat(80) });
  const title = r.root.findAll(
    (n: any) => n.type === Text && n.props.numberOfLines === 1 && textOf(n).includes('스타벅스'),
  );
  expect(title.length).toBeGreaterThan(0);
});
