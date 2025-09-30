"use client";

import { ReactNode, createContext, useContext } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

function useTypedSupabaseClient(): SupabaseClient<Database> {
  return useSupabaseClient<Database>();
}

type SupabaseClientValue = SupabaseClient<Database>;

interface SupabaseContextValue {
  supabase: SupabaseClientValue;
  session: ReturnType<typeof useSession>;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(
  undefined,
);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useTypedSupabaseClient();
  const session = useSession();
  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
