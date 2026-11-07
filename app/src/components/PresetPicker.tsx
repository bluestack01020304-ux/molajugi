import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRules } from '@/hooks/useRules';
import type { Probability } from '@/lib/database.types';
import { formatWon, previewPrice } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

export function PresetPicker({
  faceValue,
  value,
  onChange,
}: {
  faceValue: number;
  value: Probability | null;
  onChange: (p: Probability) => void;
}) {
  const { probabilities } = useRules();
  return (
    <View style={styles.row}>
      {probabilities.map((p) => {
        const selected = p === value;
        return (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            style={[styles.btn, selected && styles.btnSelected]}>
            <Text style={[styles.pct, selected && styles.pctSelected]}>{`${p}%`}</Text>
            <Text style={[styles.price, selected && styles.priceSelected]}>
              {faceValue > 0 ? formatWon(previewPrice(faceValue, p)) : '—'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    gap: 4,
  },
  btnSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pct: { fontSize: 18, fontWeight: '800', color: colors.ink },
  pctSelected: { color: colors.primary },
  price: { fontSize: 13, color: colors.sub },
  priceSelected: { color: colors.primary },
});
