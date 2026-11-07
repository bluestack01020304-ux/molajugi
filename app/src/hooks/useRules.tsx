import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useSession } from './useSession';
import { DEFAULT_RULES, parseRules, type AppRules } from '@/lib/rules';
import { supabase } from '@/lib/supabase';

export type RulesValue = AppRules & { loaded: boolean };

const RulesContext = createContext<RulesValue>({ ...DEFAULT_RULES, loaded: false });

/** 로그인한 세션마다 app_config를 한 번 읽는다. 읽기 전에는 설계 문서의 기본값을 쓴다. */
export function RulesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [rules, setRules] = useState<AppRules>(DEFAULT_RULES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    if (!userId) {
      setRules(DEFAULT_RULES);
      return;
    }
    supabase
      .from('app_config')
      .select('key, value')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('app_config fetch failed', error.message);
          return;
        }
        setRules(parseRules(data ?? []));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo(() => ({ ...rules, loaded }), [rules, loaded]);
  return <RulesContext.Provider value={value}>{children}</RulesContext.Provider>;
}

export function useRules(): RulesValue {
  return useContext(RulesContext);
}
