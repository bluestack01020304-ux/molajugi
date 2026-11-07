import { Redirect, Stack, usePathname } from 'expo-router';

import { useSession } from '@/hooks/useSession';
import { NotificationsProvider } from '@/hooks/useUnreadCount';
import { WalletProvider } from '@/hooks/useWallet';

export default function RootLayout() {
  const { session, loading } = useSession();
  const pathname = usePathname();

  if (loading) return null;
  if (!session && pathname !== '/login') return <Redirect href="/login" />;

  return (
    <WalletProvider>
      <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false }}>
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
    </WalletProvider>
  );
}
