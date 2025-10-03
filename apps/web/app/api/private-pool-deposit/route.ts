import { extractForwardAuthHeaders } from "../_shared/auth";
import { proxySupabaseEdgeFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseEdgeFunction({
    request,
    method: "POST",
    path: "private-pool-deposit",
    context: "recording private pool deposit",
    headers: extractForwardAuthHeaders(request),
  });
}
