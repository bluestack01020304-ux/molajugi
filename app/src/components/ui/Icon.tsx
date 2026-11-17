import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/lib/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
