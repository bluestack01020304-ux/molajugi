import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Thumb } from '@/components/ui/Thumb';
import type { Listing } from '@/lib/database.types';
import { CATEGORY_LABELS, asCategory, daysLeftLabel, formatWon } from '@/lib/format';
import { colors, space, type } from '@/lib/theme';

export function ListingRow({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const category = asCategory(listing.category);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Thumb category={category} size={72} />
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={1}>
          {`${listing.brand} ${listing.product_name}`}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {`${CATEGORY_LABELS[category]} · ${daysLeftLabel(listing.expires_on)}`}
        </Text>
        <View style={styles.priceLine}>
          <Text style={styles.pct}>{`${listing.probability}%`}</Text>
          <Text style={styles.price}>{formatWon(listing.price)}</Text>
          <Text style={styles.face}>{formatWon(listing.face_value)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingVertical: space.row,
    gap: space.gap,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mid: { flex: 1, minWidth: 0 },
  title: { ...type.rowTitle, color: colors.ink },
  meta: { ...type.meta, marginTop: 3 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6, flexShrink: 0 },
  pct: { ...type.price, fontWeight: '800', color: colors.primary },
  price: { ...type.price, color: colors.ink },
  face: { fontSize: 12, color: colors.faint, textDecorationLine: 'line-through' },
});
