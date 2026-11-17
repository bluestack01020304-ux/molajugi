import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

/** 사용자가 사진 저장 권한을 허용하지 않았을 때. */
export class SavePermissionError extends Error {
  constructor() {
    super('SAVE_PERMISSION_DENIED');
    this.name = 'SavePermissionError';
  }
}

/**
 * 사진을 기기에 저장한다.
 * - 웹: 브라우저의 다운로드 폴더로 내려받는다. url은 서버가 "파일로 저장" 헤더를 붙여 주는 주소여야 한다
 *   (api.signedDownloadUrl). 다른 주소(origin)의 파일은 <a download>만으로는 저장되지 않기 때문이다.
 * - 폰: 임시 폴더에 받은 뒤 사진 앱(갤러리)에 넣는다. 처음 한 번 저장 권한을 묻는다.
 */
export async function saveImage(url: string, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  // 쓰기 전용 권한만 요청한다 (사용자의 다른 사진을 읽을 필요가 없다).
  const { granted } = await MediaLibrary.requestPermissionsAsync(true);
  if (!granted) throw new SavePermissionError();
  const file = await File.downloadFileAsync(url, new File(Paths.cache, fileName), { idempotent: true });
  try {
    await MediaLibrary.Asset.create(file.uri);
  } finally {
    // 갤러리에 복사됐으니 임시 파일은 지운다.
    try {
      file.delete();
    } catch {
      // 임시 폴더라 못 지워도 시스템이 정리한다.
    }
  }
}
