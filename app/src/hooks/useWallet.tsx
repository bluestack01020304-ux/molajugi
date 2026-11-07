import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useSession } from './useSession';
import { supabase } from '@/lib/supabase';

type WalletValue = { balance: number; refresh: () => Promise<void> };

const WalletContext = createContext<WalletValue>({ balance: 0, refresh: async () => {} });

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [balance, setBalance] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      return;
    }
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('wallet refresh failed', error.message);
      return;
    }
    setBalance(data?.balance ?? 0);
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setBalance(0);
      return;
    }
    supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.warn('wallet fetch failed', error.message);
        else setBalance(data?.balance ?? 0);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo(() => ({ balance, refresh }), [balance, refresh]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletValue {
  return useContext(WalletContext);
}
