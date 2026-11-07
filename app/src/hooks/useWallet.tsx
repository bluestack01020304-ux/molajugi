import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { useSession } from './useSession';
import { supabase } from '@/lib/supabase';

type WalletValue = { balance: number; refresh: () => Promise<void> };

const WalletContext = createContext<WalletValue>({ balance: 0, refresh: async () => {} });

// 판매자는 남의 뽑기로 돈이 들어오므로 주기적으로 다시 읽는다 (알림 뱃지와 같은 주기).
const POLL_MS = 30_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [balance, setBalance] = useState(0);
  // 겹친 요청 중 가장 마지막 요청의 결과만 반영한다.
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++requestId.current;
    if (!userId) {
      setBalance(0);
      return;
    }
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (mine !== requestId.current) return;
    if (error) {
      console.warn('wallet refresh failed', error.message);
      return;
    }
    setBalance(data?.balance ?? 0);
  }, [userId]);

  useEffect(() => {
    void refresh();
    if (!userId) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      // 로그아웃·계정 전환 뒤 늦게 도착한 응답을 버린다.
      requestId.current++;
      clearInterval(timer);
      sub.remove();
    };
  }, [userId, refresh]);

  const value = useMemo(() => ({ balance, refresh }), [balance, refresh]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletValue {
  return useContext(WalletContext);
}
