import { extractForwardAuthHeaders } from "../_shared/auth";
import { proxySupabaseFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "POST",
    functionKey: "PRIVATE_POOL_DEPOSIT",
    context: "recording private pool deposit",
    headers: extractForwardAuthHeaders(request),
  });
}
