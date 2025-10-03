import { proxySupabaseEdgeFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseEdgeFunction({
    request,
    method: "POST",
    path: "process-subscription",
    context: "processing TON subscription",
  });
}
