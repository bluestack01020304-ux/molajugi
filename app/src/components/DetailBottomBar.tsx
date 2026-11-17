import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { formatPoints, formatWon } from '@/lib/format';
import { colors, space, type } from '@/lib/theme';

export function DetailBottomBar({
  price,
  faceValue,
  balance,
  undrawable,
  busy,
  onDraw,
}: {
  price: number;
  faceValue: number;
  balance: number;
  undrawable: boolean;
  busy: boolean;
  onDraw: () => void;
}) {
  const insufficient = balance < price;
  return (
    <View style={styles.bar}>
      <View style={styles.priceRow}>
        <View style={styles.priceLine}>
          <Text style={styles.price}>{formatWon(price)}</Text>
          <Text style={styles.face}>{formatWon(faceValue)}</Text>
        </View>
        <Text style={styles.mine}>{`내 포인트 ${formatPoints(balance)}`}</Text>
      </View>
      {!undrawable && insufficient && (
        <Text style={styles.warn}>포인트가 부족해요. 내 정보에서 충전하세요</Text>
      )}
      <Button
        title={undrawable ? '지금은 뽑을 수 없는 기프티콘이에요' : `${formatWon(price)}으로 뽑기`}
        disabled={undrawable || insufficient}
        busy={busy}
        onPress={onDraw}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: space.screen,
    paddingTop: 10,
    paddingBottom: space.screen,
    gap: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { ...type.priceBig, color: colors.ink },
  face: { fontSize: 12, color: colors.faint, textDecorationLine: 'line-through' },
  mine: type.meta,
  warn: { fontSize: 13, color: colors.danger },
});
