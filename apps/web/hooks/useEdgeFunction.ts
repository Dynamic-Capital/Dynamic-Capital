"use client";

import { useCallback } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { callEdgeFunction, SUPABASE_CONFIG } from "@/config/supabase";

type FunctionName = keyof typeof SUPABASE_CONFIG.FUNCTIONS;

type JsonBody = Parameters<typeof JSON.stringify>[0];

type CallOptions = {
  method?: string;
  body?: JsonBody;
  headers?: Record<string, string>;
};

export function useEdgeFunction() {
  const session = useSession();

  return useCallback(
    <T>(name: FunctionName, options: CallOptions = {}) => {
      const token = session?.access_token;
      return callEdgeFunction<T>(name, { ...options, token });
    },
    [session?.access_token],
  );
}
