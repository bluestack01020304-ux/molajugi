import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';

import { useFrameSize } from '@/lib/frame';
import { motionReduced, useNativeDriver } from '@/lib/motion';
import { GRID, cardSize, cellIndexAt, isRevealComplete } from '@/lib/scratch';
import { colors, radius, type } from '@/lib/theme';

const AUTO_REVEAL_MS = 10_000;
const TOTAL = GRID.cols * GRID.rows;

type Props = { result: 'win' | 'miss'; onRevealed: () => void };

export function ScratchCard({ result, onRevealed }: Props) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  // 창 크기가 바뀌면(컴퓨터에서 창을 줄이거나 늘리면) 카드도 따라 바뀐다.
  const frame = useFrameSize();
  const card = cardSize(frame.width, frame.height);
  const [size, setSize] = useState(card);
  const set = useRef<Set<number>>(new Set());
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const firedRef = useRef(false);
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;
  // 다 긁으면 남은 코팅이 스르륵 걷히고(coat 1→0) 결과 글자가 톡 튀어나온다(pop).
  const coat = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;

  const finish = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onRevealedRef.current();
    if (motionReduced()) {
      setDone(true);
      return;
    }
    Animated.timing(coat, {
      toValue: 0,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver,
    }).start(() => setDone(true));
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, speed: 10, bounciness: 16, useNativeDriver }).start();
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
      <View style={[styles.card, card]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
        {/* 웹에서 마우스로 긁을 때 글자가 선택되거나 끌려 나와 결과가 미리 보이지 않게 한다. */}
        <Animated.Text
          selectable={false}
          style={[styles.result, isWin ? styles.win : styles.miss, { transform: [{ scale: pop }] }]}>
          {isWin ? '당첨!' : '꽝'}
        </Animated.Text>
        {!done && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: coat }]} {...pan.panHandlers}>
            {Array.from({ length: TOTAL }, (_, i) =>
              revealed.has(i) ? null : (
                <View
                  key={i}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: (i % GRID.cols) * cellW,
                    top: Math.floor(i / GRID.cols) * cellH,
                    // 칸 사이에 틈이 있으면 그 사이로 결과 글자 색이 비쳐 긁기 전에 결과를 알 수 있다.
                    width: cellW + 0.5,
                    height: cellH + 0.5,
                    backgroundColor: (i + Math.floor(i / GRID.cols)) % 2 === 0 ? colors.coatA : colors.coatB,
                  }}
                />
              ),
            )}
          </Animated.View>
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
    userSelect: 'none',
  },
  result: { fontSize: 44, fontWeight: '900', userSelect: 'none', pointerEvents: 'none' },
  win: { color: colors.primary },
  miss: { color: colors.sub, fontWeight: '800' },
});
