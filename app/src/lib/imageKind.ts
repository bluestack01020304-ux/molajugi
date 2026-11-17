/**
 * 파일 내용의 첫 바이트로 사진 형식을 알아낸다. JPEG도 PNG도 아니면 null.
 * 올리기 전에 이걸로 확인해서, 사진이 아닌 내용(읽기 실패로 생긴 오류 문구 등)이 사진인 척 올라가는 것을 막는다.
 */
export function imageKind(bytes: Uint8Array): 'png' | 'jpeg' | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  return null;
}
