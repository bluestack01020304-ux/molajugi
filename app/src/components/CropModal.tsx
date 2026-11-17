import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { dragRect, fitSize, initialCrop, toPixelCrop, zoneAt, type Rect, type Size, type Zone } from '@/lib/crop';
import { cropImage } from '@/lib/cropImage';
import { showMessage } from '@/lib/dialog';
import { colors, radius, space, type } from '@/lib/theme';

const HANDLE = 22;

/**
 * 사진에서 보여 줄 부분만 잘라 내는 화면. 네모의 모서리·변을 끌어 크기를 바꾸고, 안쪽을 끌어 옮긴다.
 * "자르기"를 누르면 잘라 낸 새 사진의 주소를 onDone으로 넘긴다.
 */
export function CropModal({
  uri,
  barcodeTop = null,
  onCancel,
  onDone,
  onPickAnother,
}: {
  /** 자를 사진. null이면 화면을 닫는다. */
  uri: string | null;
  /** 이 사진에서 바코드 윗변의 높이 비율(0~1). 알면 네모를 바코드 바로 위까지로 맞춰 둔다. */
  barcodeTop?: number | null;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
  /** 다른 사진을 골라 자르고 싶을 때. */
  onPickAnother: () => void;
}) {
  const win = useWindowDimensions();
  const [image, setImage] = useState<Size | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // 사진이 놓일 자리: 화면 가운데, 폰 폭을 넘지 않게.
  const box = useMemo(
    () => ({ width: Math.min(win.width, 440) - space.screen * 2, height: Math.max(200, win.height - 260) }),
    [win.width, win.height],
  );
  const shown = useMemo(() => (image ? fitSize(image, box) : null), [image, box]);

  // 사진이 바뀌면 크기를 다시 재고 네모를 처음 위치로 돌린다.
  useEffect(() => {
    setImage(null);
    setRect(null);
    setFailed(false);
    if (!uri) return;
    let active = true;
    Image.getSize(
      uri,
      (width, height) => active && setImage({ width, height }),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [uri]);

  useEffect(() => {
    if (shown) setRect(initialCrop(shown, barcodeTop));
  }, [shown, barcodeTop]);

  // PanResponder는 한 번만 만들므로 최신 값은 ref로 읽는다.
  const live = useRef({ rect, shown });
  live.current = { rect, shown };
  const drag = useRef<{ zone: Zone; start: Rect } | null>(null);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { rect: r } = live.current;
          if (!r) return;
          drag.current = { zone: zoneAt(r, e.nativeEvent.locationX, e.nativeEvent.locationY), start: r };
        },
        onPanResponderMove: (_e, g) => {
          const { shown: s } = live.current;
          if (!drag.current || !s) return;
          setRect(dragRect(drag.current.start, drag.current.zone, g.dx, g.dy, s));
        },
        onPanResponderRelease: () => {
          drag.current = null;
        },
      }),
    [],
  );

  async function confirm() {
    if (!uri || !image || !shown || !rect || busy) return;
    setBusy(true);
    try {
      onDone(await cropImage(uri, toPixelCrop(rect, shown, image)));
    } catch (e) {
      console.warn('crop failed', (e as Error).message);
      showMessage('사진을 자르지 못했어요', '다른 사진으로 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={uri !== null} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>보여주는 사진 자르기</Text>
          <Text style={styles.hint}>
            {barcodeTop !== null
              ? '바코드를 찾아서 그 위까지만 골라 뒀어요. 네모 안쪽만 모두에게 보여요.'
              : '바코드가 네모 밖으로 나가게 맞춰 주세요. 네모 안쪽만 모두에게 보여요.'}
          </Text>

          <View style={[styles.stage, box]}>
            {failed ? (
              <Text style={styles.hint}>사진을 불러오지 못했어요</Text>
            ) : !uri || !shown || !rect ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={shown}>
                <Image source={{ uri }} style={shown} resizeMode="contain" />
                {/* 사진 전체를 덮는 조작 영역. 자식은 터치를 받지 않아 좌표가 항상 이 영역 기준이다. */}
                <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
                  {/* 네모 바깥 네 조각을 어둡게 */}
                  <View pointerEvents="none" style={[styles.shade, { left: 0, top: 0, right: 0, height: rect.y }]} />
                  <View
                    pointerEvents="none"
                    style={[styles.shade, { left: 0, top: rect.y + rect.height, right: 0, bottom: 0 }]}
                  />
                  <View
                    pointerEvents="none"
                    style={[styles.shade, { left: 0, top: rect.y, width: rect.x, height: rect.height }]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.shade,
                      { left: rect.x + rect.width, top: rect.y, right: 0, height: rect.height },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[styles.frame, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]}>
                    <View style={[styles.handle, { left: -HANDLE / 2, top: -HANDLE / 2 }]} />
                    <View style={[styles.handle, { right: -HANDLE / 2, top: -HANDLE / 2 }]} />
                    <View style={[styles.handle, { left: -HANDLE / 2, bottom: -HANDLE / 2 }]} />
                    <View style={[styles.handle, { right: -HANDLE / 2, bottom: -HANDLE / 2 }]} />
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Button variant="outline" title="취소" disabled={busy} onPress={onCancel} style={styles.action} />
            <Button
              title="자르기"
              busy={busy}
              disabled={!rect || failed}
              onPress={confirm}
              style={styles.action}
            />
          </View>
          <Pressable onPress={onPickAnother} disabled={busy} style={styles.another}>
            <Text style={styles.anotherText}>다른 사진 고르기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: 440,
    padding: space.screen,
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
  },
  title: { ...type.screenTitle, color: colors.ink },
  hint: { ...type.body, color: colors.sub },
  stage: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg2, borderRadius: radius.sm },
  shade: { position: 'absolute', backgroundColor: colors.scrim },
  frame: { position: 'absolute', borderWidth: 2, borderColor: colors.bg },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actions: { flexDirection: 'row', gap: space.gap, marginTop: 4 },
  action: { flex: 1 },
  another: { alignItems: 'center', padding: 6 },
  anotherText: { color: colors.sub, fontSize: 13 },
});
