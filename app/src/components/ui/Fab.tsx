import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, space } from '@/lib/theme';

export function Fab({ label = '+ 올리기', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.fab} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: space.screen,
    bottom: space.screen,
    backgroundColor: colors.primary,
    borderRadius: radius.fab,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { color: colors.bg, fontSize: 14, fontWeight: '700' },
});
