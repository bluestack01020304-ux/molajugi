import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { Category } from '@/lib/database.types';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/format';

type Value = Category | 'all';

export function CategoryChips({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const items: { key: Value; label: string }[] = [
    { key: 'all', label: '전체' },
    ...CATEGORIES.map((c) => ({ key: c as Value, label: CATEGORY_LABELS[c] })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      {items.map((it) => {
        const selected = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.label, selected && styles.labelSelected]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  content: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#eee' },
  chipSelected: { backgroundColor: '#222' },
  label: { fontSize: 14, color: '#444' },
  labelSelected: { color: '#fff', fontWeight: '600' },
});
