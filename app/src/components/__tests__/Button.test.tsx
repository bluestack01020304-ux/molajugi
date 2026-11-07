import { act } from 'react';
import { Text } from 'react-native';
import { create, type ReactTestRenderer } from 'react-test-renderer';

import { Button } from '../ui/Button';

async function render(el: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(el);
  });
  return r;
}

test('button_label_stays_on_one_centered_line', async () => {
  const r = await render(<Button title="충전 (테스트 +10,000P)" onPress={() => {}} />);
  const label = r.root.findByType(Text as any);
  expect(label.props.numberOfLines).toBe(1);
  expect(label.props.adjustsFontSizeToFit).toBe(true);
  expect(JSON.stringify(label.props.style)).toMatch(/"textAlign":"center"/);
});

test('button_disabled_sets_accessibility_state', async () => {
  const r = await render(<Button title="출금 (준비중)" disabled />);
  const disabled = r.root.findAll((n: any) => n.props.accessibilityState?.disabled === true);
  expect(disabled.length).toBeGreaterThan(0);
});
