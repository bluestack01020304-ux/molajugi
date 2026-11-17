import { StyleSheet, Text, View } from 'react-native';

import { daysLeft } from '@/lib/format';
import { colors } from '@/lib/theme';

export type Tone = 'live' | 'hold' | 'ok' | 'warn' | 'muted';

const COLORS: Record<Tone, { bg: string; fg: string }> = {
  live: { bg: colors.primarySoft, fg: colors.primary },
  hold: { bg: colors.holdBg, fg: colors.holdFg },
  ok: { bg: colors.okBg, fg: colors.okFg },
  warn: { bg: colors.dangerSoft, fg: colors.danger },
  muted: { bg: colors.mutedBg, fg: colors.sub },
};

export function settlementBadge(status: string): { label: string; tone: Tone } {
  switch (status) {
    case 'held':
      return { label: '사용 확인 대기', tone: 'hold' };
    case 'confirmed':
    case 'auto_released':
      return { label: '확인됨', tone: 'ok' };
    case 'disputed':
      return { label: '분쟁', tone: 'warn' };
    case 'refunded':
      return { label: '환불됨', tone: 'muted' };
    default:
      return { label: status, tone: 'muted' };
  }
}

export function listingBadge(row: {
  status: string;
  expires_on: string;
  settlement_status?: string | null;
}): { label: string; tone: Tone } {
  switch (row.status) {
    case 'active':
      return daysLeft(row.expires_on) <= 7
        ? { label: '만료 임박', tone: 'warn' }
        : { label: '판매중', tone: 'live' };
    case 'won':
      return row.settlement_status === 'held' || row.settlement_status === 'disputed'
        ? { label: '정산 대기', tone: 'hold' }
        : { label: '당첨 완료', tone: 'ok' };
    case 'withdrawn':
      return { label: '내림', tone: 'muted' };
    case 'expired':
      return { label: '만료', tone: 'muted' };
    default:
      return { label: row.status, tone: 'muted' };
  }
}

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const c = COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: '700' },
});
