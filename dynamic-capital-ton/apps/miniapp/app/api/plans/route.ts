import { proxySupabaseEdgeFunction } from "../_shared/supabase";

export function GET(request: Request) {
  return proxySupabaseEdgeFunction({
    request,
    method: "GET",
    path: "plans",
    cache: "no-store",
    context: "loading plans",
  });
}
