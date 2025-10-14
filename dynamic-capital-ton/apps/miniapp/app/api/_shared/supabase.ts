import {
  resolveSupabaseFunctionPath,
  type SupabaseFunctionKey,
} from "@shared/supabase/functions";
import {
  createSupabaseProxyEnvironment,
  type ProxySupabaseFunctionOptions,
} from "@shared/supabase/proxy";

export type { SupabaseFunctionKey, ProxySupabaseFunctionOptions };

const {
  resolveSupabaseFunctionUrl,
  buildSupabaseFunctionHeaders,
  missingSupabaseConfigResponse,
  resetSupabaseFunctionCacheForTesting,
  proxySupabaseEdgeFunction,
  proxySupabaseFunction,
} = createSupabaseProxyEnvironment({
  logPrefix: "miniapp",
  resolveFunctionPath: resolveSupabaseFunctionPath,
});

export {
  resolveSupabaseFunctionUrl,
  buildSupabaseFunctionHeaders,
  missingSupabaseConfigResponse,
  resetSupabaseFunctionCacheForTesting,
  proxySupabaseEdgeFunction,
  proxySupabaseFunction,
};
