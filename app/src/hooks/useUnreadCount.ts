import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from './useSession';
import { supabase } from '@/lib/supabase';

export function useUnreadCount(): number {
  const { session } = useSession();
  const userId = session?.user.id;
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setCount(0);
        return;
      }
      let active = true;
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .then(({ count: c }) => {
          if (active) setCount(c ?? 0);
        });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  return count;
}
