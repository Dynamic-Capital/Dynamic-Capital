import { proxySupabaseFunction } from "../_shared/supabase";

export function GET(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "GET",
    functionKey: "PLANS",
    cache: "no-store",
    context: "loading plans",
  });
}
