import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Listing } from '@/lib/database.types';
import { CATEGORY_EMOJI, asCategory, daysLeftLabel, formatPoints, formatWon } from '@/lib/format';

export function ListingRow({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.circle}>
        <Text style={styles.emoji}>{CATEGORY_EMOJI[asCategory(listing.category)]}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.brand} numberOfLines={1}>
          {listing.brand}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {listing.product_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {`액면 ${formatWon(listing.face_value)} · ${daysLeftLabel(listing.expires_on)}`}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{`${listing.probability}%`}</Text>
        </View>
        <Text style={styles.price}>{formatPoints(listing.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  mid: { flex: 1 },
  brand: { fontSize: 11, color: '#888' },
  name: { fontSize: 15, fontWeight: '700', color: '#111' },
  meta: { fontSize: 12, color: '#666', marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  badge: { backgroundColor: '#fff1ea', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#e8531f', fontSize: 12, fontWeight: '700' },
  price: { fontSize: 15, fontWeight: '700', color: '#111' },
});
