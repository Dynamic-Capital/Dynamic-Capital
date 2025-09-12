"use client";

import { useCallback } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { callEdgeFunction, SUPABASE_CONFIG } from "@/config/supabase";

type FunctionName = keyof typeof SUPABASE_CONFIG.FUNCTIONS;

type CallOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

export function useEdgeFunction() {
  const session = useSession();

  return useCallback(
    async <T,>(name: FunctionName, options: CallOptions = {}) => {
      const token = session?.access_token;
      return callEdgeFunction<T>(name, { ...options, token });
    },
    [session?.access_token],
  );
}
