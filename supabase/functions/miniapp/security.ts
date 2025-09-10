export const ENHANCED_SECURITY_HEADERS = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "permissions-policy": "geolocation=(), microphone=(), camera=()",
  "content-security-policy":
    "default-src 'self' https://*.telegram.org https://telegram.org; " +
    "script-src 'self' 'unsafe-inline' https://*.telegram.org; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.functions.supabase.co https://*.supabase.co wss://*.supabase.co; " +
    "font-src 'self' data:; " +
    "frame-ancestors 'self' https://*.telegram.org https://telegram.org https://*.supabase.co https://*.lovable.dev;",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-frame-options": "ALLOWALL",
} as const;

export function withSecurity(
  resp: Response,
  extra: Record<string, string> = {},
): Response {
  const h = new Headers(resp.headers);
  const originalContentType = resp.headers.get("content-type");

  for (const [k, v] of Object.entries(ENHANCED_SECURITY_HEADERS)) h.set(k, v);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);

  if (originalContentType) {
    h.set("content-type", originalContentType);
  }

  return new Response(resp.body, { status: resp.status, headers: h });
}
