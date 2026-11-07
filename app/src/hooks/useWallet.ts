import { useCallback, useEffect, useState } from 'react';

import { useSession } from './useSession';
import { supabase } from '@/lib/supabase';

export function useWallet(): { balance: number; refresh: () => Promise<void> } {
  const { session } = useSession();
  const userId = session?.user.id;
  const [balance, setBalance] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      return;
    }
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { balance, refresh };
}
