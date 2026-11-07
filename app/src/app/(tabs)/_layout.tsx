import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useWallet } from '@/hooks/useWallet';
import { formatPoints } from '@/lib/format';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={styles.icon}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { balance } = useWallet();
  const unread = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <Text style={styles.points}>{formatPoints(balance)}</Text>,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: '뽑기', tabBarIcon: () => <TabIcon emoji="🎲" /> }}
      />
      <Tabs.Screen
        name="gifticons"
        options={{ title: '내 기프티콘', tabBarIcon: () => <TabIcon emoji="🎟️" /> }}
      />
      <Tabs.Screen
        name="sell"
        options={{ title: '판매', tabBarIcon: () => <TabIcon emoji="🏷️" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: () => <TabIcon emoji="👤" />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 20 },
  points: { marginRight: 16, fontSize: 16, fontWeight: '600' },
});
