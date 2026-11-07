import { StyleSheet, Text, View } from 'react-native';

import { daysLeft } from '@/lib/format';

export type Tone = 'live' | 'hold' | 'ok' | 'warn' | 'muted';

const COLORS: Record<Tone, { bg: string; fg: string }> = {
  live: { bg: '#e6f6ea', fg: '#1e7b3a' },
  hold: { bg: '#fff4d6', fg: '#9a6b00' },
  ok: { bg: '#e8f0fe', fg: '#1a4fb4' },
  warn: { bg: '#fdecea', fg: '#c0392b' },
  muted: { bg: '#eee', fg: '#555' },
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
  badge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '700' },
});
