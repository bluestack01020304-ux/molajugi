import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

// 컴퓨터처럼 넓은 창에서는 앱을 폰 크기 틀 안에 가운데로 띄운다 (components/WebFrame).

const FRAME_MIN_WINDOW = 600; // 이보다 좁은 창은 폰처럼 꽉 채운다
const FRAME_WIDTH = 440;
const FRAME_MARGIN = 24; // 틀 위아래 여백
const FRAME_MIN_HEIGHT_FOR_MARGIN = 720;
const BRAND_MIN_WINDOW = 1040; // 이보다 넓으면 틀 옆에 소개 문구를 보여 준다

export type FrameLayout = {
  framed: boolean;
  /** 앱 화면이 실제로 쓰는 크기 */
  width: number;
  height: number;
  /** 틀 위아래 여백과 둥근 모서리를 줄지 */
  floating: boolean;
  showBrand: boolean;
};

export function frameLayout(windowWidth: number, windowHeight: number, isWeb: boolean): FrameLayout {
  if (!isWeb || windowWidth < FRAME_MIN_WINDOW) {
    return { framed: false, width: windowWidth, height: windowHeight, floating: false, showBrand: false };
  }
  const floating = windowHeight >= FRAME_MIN_HEIGHT_FOR_MARGIN;
  return {
    framed: true,
    width: FRAME_WIDTH,
    height: windowHeight - (floating ? FRAME_MARGIN * 2 : 0),
    floating,
    showBrand: windowWidth >= BRAND_MIN_WINDOW,
  };
}

export const FrameSizeContext = createContext<{ width: number; height: number } | null>(null);

/** 앱 화면이 쓸 수 있는 크기. 틀 밖(테스트 등)에서는 창 크기를 돌려준다. */
export function useFrameSize(): { width: number; height: number } {
  const frame = useContext(FrameSizeContext);
  const win = useWindowDimensions();
  return frame ?? { width: win.width, height: win.height };
}
