import { StyleSheet, Text, View } from 'react-native';

import { CATEGORY_EMOJI, asCategory } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

export function Thumb({ category, size = 72 }: { category: string; size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Text style={{ fontSize: Math.round(size * 0.42) }}>{CATEGORY_EMOJI[asCategory(category)]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.bg2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
