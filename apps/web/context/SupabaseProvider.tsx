"use client";

import { ReactNode } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export function SupabaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const useSupabase = () => {
  const supabase = useSupabaseClient();
  const session = useSession();
  return { supabase, session };
};
