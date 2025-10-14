import { proxySupabaseFunction } from "../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "POST",
    functionKey: "LINK_WALLET",
    context: "linking TON wallet",
  });
}
