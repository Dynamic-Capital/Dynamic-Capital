import { extractForwardAuthHeaders } from "../_shared/auth";
import { proxySupabaseFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "POST",
    functionKey: "PRIVATE_POOL_WITHDRAW",
    context: "handling private pool withdrawal",
    headers: extractForwardAuthHeaders(request),
  });
}
