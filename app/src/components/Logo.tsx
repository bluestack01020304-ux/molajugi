import { Image } from 'react-native';

// 원본: assets/images/logo.png (인디고 타일 위 흰 기프티콘 + 반짝임)
const SOURCE = require('@/assets/images/logo.png');

export function Logo({ size = 64 }: { size?: number }) {
  return (
    <Image
      source={SOURCE}
      accessibilityLabel="몰아주기 로고"
      style={{ width: size, height: size, borderRadius: size * 0.225 }}
    />
  );
}
