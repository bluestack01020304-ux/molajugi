import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useSession } from './useSession';
import { supabase } from '@/lib/supabase';

type UnreadValue = { count: number; refresh: () => Promise<void> };

const UnreadContext = createContext<UnreadValue>({ count: 0, refresh: async () => {} });

const POLL_MS = 30_000;

async function fetchUnread(userId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) {
    console.warn('unread count failed', error.message);
    return null;
  }
  return count ?? 0;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    const n = await fetchUnread(userId);
    if (n !== null) setCount(n);
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setCount(0);
      return;
    }
    const load = async () => {
      const n = await fetchUnread(userId);
      if (active && n !== null) setCount(n);
    };
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnreadCount(): number {
  return useContext(UnreadContext).count;
}

export function useRefreshUnread(): () => Promise<void> {
  return useContext(UnreadContext).refresh;
}
