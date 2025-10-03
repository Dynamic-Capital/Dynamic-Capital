import { proxySupabaseEdgeFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseEdgeFunction({
    request,
    method: "POST",
    path: "link-wallet",
    context: "linking TON wallet",
  });
}
