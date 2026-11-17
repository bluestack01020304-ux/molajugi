// 보여주는 사진(바코드를 잘라 낸 사진)의 주소. 공개 버킷 previews에 있어 서명 없이 바로 볼 수 있다.
// Supabase 클라이언트를 불러오지 않도록 주소를 직접 만든다 (목록 컴포넌트와 테스트가 가볍게 쓰도록).

/** 사진이 없는 옛 매물은 null. */
export function previewUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/previews/${path}`;
}
