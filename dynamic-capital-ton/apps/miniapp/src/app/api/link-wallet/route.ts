import { proxySupabaseFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "POST",
    functionKey: "TON_CONNECT_SESSION",
    context: "orchestrating TON Connect session",
  });
}
