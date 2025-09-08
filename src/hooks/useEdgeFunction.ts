import { useSupabase } from '@/context/SupabaseProvider';
import { callEdgeFunction, SUPABASE_CONFIG } from "@/config/supabase";

type FunctionName = keyof typeof SUPABASE_CONFIG.FUNCTIONS;

type CallOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

export function useEdgeFunction() {
  const { session } = useSupabase();

  return async function edgeFunction<T>(
    name: FunctionName,
    options: CallOptions = {},
  ) {
    const token = session?.access_token;
    return callEdgeFunction<T>(name, { ...options, token });
  };
}

