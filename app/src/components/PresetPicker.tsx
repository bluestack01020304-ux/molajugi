import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRules } from '@/hooks/useRules';
import type { Probability } from '@/lib/database.types';
import { formatWon, previewPrice } from '@/lib/format';

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
            <Text style={styles.price}>{faceValue > 0 ? formatWon(previewPrice(faceValue, p)) : '—'}</Text>
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
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    gap: 4,
  },
  btnSelected: { borderColor: '#e8531f', backgroundColor: '#fff1ea' },
  pct: { fontSize: 18, fontWeight: '700', color: '#444' },
  pctSelected: { color: '#e8531f' },
  price: { fontSize: 13, color: '#666' },
});
