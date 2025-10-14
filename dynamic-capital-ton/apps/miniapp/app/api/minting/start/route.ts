import { proxySupabaseFunction } from "../../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "POST",
    functionKey: "START_MINTING",
    context: "starting theme mint",
  });
}
