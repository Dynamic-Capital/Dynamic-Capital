import { proxySupabaseFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "POST",
    functionKey: "PROCESS_SUBSCRIPTION",
    context: "processing subscription",
  });
}
