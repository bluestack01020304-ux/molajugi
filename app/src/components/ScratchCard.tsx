import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';

import { GRID, cellIndexAt, isRevealComplete } from '@/lib/scratch';
import { colors, radius, type } from '@/lib/theme';

const AUTO_REVEAL_MS = 10_000;
const TOTAL = GRID.cols * GRID.rows;
const CARD_WIDTH = Dimensions.get('window').width - 32;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

type Props = { result: 'win' | 'miss'; onRevealed: () => void };

export function ScratchCard({ result, onRevealed }: Props) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [size, setSize] = useState({ width: CARD_WIDTH, height: CARD_HEIGHT });
  const set = useRef<Set<number>>(new Set());
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const firedRef = useRef(false);
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;

  const finish = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    setDone(true);
    onRevealedRef.current();
  };

  useEffect(() => {
    const t = setTimeout(finish, AUTO_REVEAL_MS);
    return () => clearTimeout(t);
  }, []);

  const scratchAt = (x: number, y: number) => {
    if (firedRef.current) return;
    const idx = cellIndexAt(x, y, sizeRef.current.width, sizeRef.current.height);
    if (idx === null || set.current.has(idx)) return;
    set.current.add(idx);
    setRevealed(new Set(set.current));
    if (isRevealComplete(set.current.size, TOTAL)) finish();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => scratchAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => scratchAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
      }),
    [],
  );

  const cellW = size.width / GRID.cols;
  const cellH = size.height / GRID.rows;
  const isWin = result === 'win';

  return (
    <View style={styles.wrap}>
      {!done && <Text style={styles.hint}>손가락으로 긁어 보세요</Text>}
      <View
        style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
        onLayout={(e) => setSize(e.nativeEvent.layout)}>
        <Text style={[styles.result, isWin ? styles.win : styles.miss]}>
          {isWin ? '당첨!' : '꽝'}
        </Text>
        {!done && (
          <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
            {Array.from({ length: TOTAL }, (_, i) =>
              revealed.has(i) ? null : (
                <View
                  key={i}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: (i % GRID.cols) * cellW,
                    top: Math.floor(i / GRID.cols) * cellH,
                    width: cellW - 1,
                    height: cellH - 1,
                    backgroundColor: (i + Math.floor(i / GRID.cols)) % 2 === 0 ? colors.coatA : colors.coatB,
                  }}
                />
              ),
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  hint: { ...type.meta, fontSize: 14 },
  card: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  result: { fontSize: 44, fontWeight: '900' },
  win: { color: colors.primary },
  miss: { color: colors.sub, fontWeight: '800' },
});
