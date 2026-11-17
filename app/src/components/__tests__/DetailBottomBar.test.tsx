import { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';

import { DetailBottomBar } from '../DetailBottomBar';

async function render(props: Partial<React.ComponentProps<typeof DetailBottomBar>>): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <DetailBottomBar
        price={2250}
        faceValue={4500}
        balance={5000}
        undrawable={false}
        busy={false}
        onDraw={() => {}}
        {...props}
      />,
    );
  });
  return r;
}

test('detail_disabled_when_insufficient', async () => {
  const r = await render({ balance: 1000 });
  const disabled = r.root.findAll((n: any) => n.props.accessibilityState?.disabled === true);
  expect(disabled.length).toBeGreaterThan(0);
  expect(JSON.stringify(r.toJSON())).toMatch(/포인트가 부족해요/);
});

test('detail_enabled_when_affordable', async () => {
  const r = await render({});
  const json = JSON.stringify(r.toJSON());
  expect(json).toMatch(/2,250원으로 뽑기/);
  expect(json).toMatch(/4,500원/);
  const disabled = r.root.findAll((n: any) => n.props.accessibilityState?.disabled === true);
  expect(disabled.length).toBe(0);
});

test('detail_undrawable_shows_closed_label', async () => {
  const r = await render({ undrawable: true });
  expect(JSON.stringify(r.toJSON())).toMatch(/지금은 뽑을 수 없는 기프티콘이에요/);
});
