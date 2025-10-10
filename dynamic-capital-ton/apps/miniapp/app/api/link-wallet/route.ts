import { proxySupabaseEdgeFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseEdgeFunction({
    request,
    method: "POST",
    path: "ton-connect-session",
    context: "orchestrating TON Connect session",
  });
}
