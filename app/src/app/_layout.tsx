import { Redirect, Stack, usePathname } from 'expo-router';

import { useSession } from '@/hooks/useSession';

export default function RootLayout() {
  const { session, loading } = useSession();
  const pathname = usePathname();

  if (loading) return null;
  if (!session && pathname !== '/login') return <Redirect href="/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
