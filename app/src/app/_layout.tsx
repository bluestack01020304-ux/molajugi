import { Redirect, Stack, usePathname } from 'expo-router';

import { useSession } from '@/hooks/useSession';
import { RulesProvider } from '@/hooks/useRules';
import { NotificationsProvider } from '@/hooks/useUnreadCount';
import { WalletProvider } from '@/hooks/useWallet';
import { colors, type } from '@/lib/theme';

export default function RootLayout() {
  const { session, loading } = useSession();
  const pathname = usePathname();

  if (loading) return null;
  if (!session && pathname !== '/login') return <Redirect href="/login" />;

  return (
    <WalletProvider>
      <RulesProvider>
        <NotificationsProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              headerShadowVisible: false,
              headerTitleAlign: 'left',
              headerTitleStyle: { ...type.headerTitle, color: colors.ink },
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.ink,
              contentStyle: { backgroundColor: colors.bg },
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="listing/[id]" options={{ headerShown: true, presentation: 'card' }} />
            <Stack.Screen name="draw/[id]" options={{ headerShown: true, presentation: 'card' }} />
            <Stack.Screen
              name="gifticon/[id]"
              options={{ headerShown: true, presentation: 'card', title: '당첨 기프티콘' }}
            />
            <Stack.Screen
              name="sell/new"
              options={{ headerShown: true, presentation: 'card', title: '기프티콘 올리기' }}
            />
          </Stack>
        </NotificationsProvider>
      </RulesProvider>
    </WalletProvider>
  );
}
