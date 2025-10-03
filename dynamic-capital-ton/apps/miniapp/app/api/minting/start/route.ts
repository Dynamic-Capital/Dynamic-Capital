import { proxySupabaseEdgeFunction } from "../../_shared/supabase";

export function POST(request: Request) {
  return proxySupabaseEdgeFunction({
    request,
    method: "POST",
    path: "start-minting",
    context: "starting theme mint",
  });
}
