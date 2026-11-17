import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_EMOJI, asCategory } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

/** 목록의 네모 썸네일. 보여주는 사진(uri)이 있으면 사진을, 없거나 못 불러오면 카테고리 이모지를 보여 준다. */
export function Thumb({
  category,
  size = 72,
  uri = null,
}: {
  category: string;
  size?: number;
  uri?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.42) }}>{CATEGORY_EMOJI[asCategory(category)]}</Text>
      )}
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
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
