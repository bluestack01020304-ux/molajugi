import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * 사진에서 네모 영역만 잘라 새 사진 파일(JPEG)을 만들고 그 주소를 돌려준다.
 * 폰에서는 인터넷 주소의 사진을 바로 자를 수 없어, 먼저 임시 폴더에 내려받는다
 * (수정 화면에서 이미 올라가 있는 원본 사진을 자를 때).
 */
export async function cropImage(
  uri: string,
  crop: { originX: number; originY: number; width: number; height: number },
): Promise<string> {
  let source = uri;
  if (Platform.OS !== 'web' && /^https?:/i.test(uri)) {
    const name = `crop-source-${Date.now().toString(36)}.img`;
    source = (await File.downloadFileAsync(uri, new File(Paths.cache, name), { idempotent: true })).uri;
  }
  const rendered = await ImageManipulator.manipulate(source).crop(crop).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return saved.uri;
}
