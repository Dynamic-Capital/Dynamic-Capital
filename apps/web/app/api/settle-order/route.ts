import { extractForwardAuthHeaders } from "../_shared/auth";
import { proxySupabaseFunction } from "../_shared/supabase";

function buildForwardHeaders(request: Request): HeadersInit | undefined {
  const headers = new Headers();
  const authHeaders = extractForwardAuthHeaders(request);

  if (authHeaders) {
    for (const [key, value] of new Headers(authHeaders)) {
      headers.set(key, value);
    }
  }

  const adminSecret = request.headers.get("X-Admin-Secret");
  if (adminSecret) {
    headers.set("X-Admin-Secret", adminSecret);
  }

  return headers.keys().next().done ? undefined : headers;
}

export function POST(request: Request) {
  return proxySupabaseFunction({
    request,
    method: "POST",
    functionKey: "SETTLE_ORDER",
    context: "settling treasury transfer",
    headers: buildForwardHeaders(request),
  });
}
