import { SUPABASE_CONFIG, type SupabaseFunctionKey } from "@/config/supabase";
import {
  createSupabaseProxyEnvironment,
  type ProxySupabaseFunctionOptions,
} from "@shared/supabase/proxy";

export type { ProxySupabaseFunctionOptions, SupabaseFunctionKey };

const {
  resolveSupabaseFunctionUrl,
  buildSupabaseFunctionHeaders,
  missingSupabaseConfigResponse,
  resetSupabaseFunctionCacheForTesting,
  proxySupabaseEdgeFunction,
  proxySupabaseFunction,
} = createSupabaseProxyEnvironment({
  logPrefix: "web",
  resolveFunctionPath: (key) => SUPABASE_CONFIG.FUNCTIONS[key],
});

export {
  buildSupabaseFunctionHeaders,
  missingSupabaseConfigResponse,
  proxySupabaseEdgeFunction,
  proxySupabaseFunction,
  resetSupabaseFunctionCacheForTesting,
  resolveSupabaseFunctionUrl,
};
