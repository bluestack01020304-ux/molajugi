import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { Category } from '@/lib/database.types';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/format';
import { colors, radius, space } from '@/lib/theme';

type Value = Category | 'all';

export function CategoryChips({
  value,
  onChange,
  includeAll = true,
}: {
  value: Value;
  onChange: (v: Value) => void;
  includeAll?: boolean;
}) {
  const items: { key: Value; label: string }[] = [
    ...(includeAll ? [{ key: 'all' as Value, label: '전체' }] : []),
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
  scroll: { flexGrow: 0, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line },
  content: { paddingHorizontal: space.screen, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  label: { fontSize: 14, color: colors.ink },
  labelSelected: { color: colors.bg, fontWeight: '600' },
});
