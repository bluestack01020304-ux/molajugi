import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import { Logo } from '@/components/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { colors, space, type } from '@/lib/theme';

function tabIcon(outline: IconName, filled: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Icon name={focused ? filled : outline} color={String(color)} />
  );
}

function HomeHeaderTitle() {
  return (
    <View style={styles.homeTitle}>
      <Logo size={26} />
      <Text style={[type.screenTitle, { color: colors.ink }]}>몰아주기</Text>
    </View>
  );
}

function BellButton({ unread }: { unread: number }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="알림"
      style={styles.bell}
      onPress={() => router.navigate('/(tabs)/profile')}>
      <Icon name="notifications-outline" size={24} />
      {unread > 0 && <View style={styles.dot} />}
    </Pressable>
  );
}

export default function TabsLayout() {
  const unread = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitleStyle: { ...type.headerTitle, color: colors.ink },
        headerStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.sub,
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14 },
        tabBarStyle: [{ borderTopColor: colors.line, backgroundColor: colors.bg }, webTabBar],
        sceneStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          headerTitle: () => <HomeHeaderTitle />,
          headerRight: () => <BellButton unread={unread} />,
          tabBarIcon: tabIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="gifticons"
        options={{ title: '내 기프티콘', tabBarIcon: tabIcon('ticket-outline', 'ticket') }}
      />
      <Tabs.Screen
        name="sell"
        options={{ title: '판매', tabBarIcon: tabIcon('pricetag-outline', 'pricetag') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: tabIcon('person-outline', 'person'),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tabs>
  );
}

// 웹에서는 기본 탭바 높이가 낮아 글자 아랫부분이 잘린다. 높이와 위아래 여백을 직접 준다.
// 폰에서는 기기 하단 여백(홈 표시줄)을 탭바가 알아서 계산하므로 건드리지 않는다.
const webTabBar = Platform.OS === 'web' ? { height: 64 } : null;

const styles = StyleSheet.create({
  homeTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bell: { marginRight: space.screen, padding: 4 },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
