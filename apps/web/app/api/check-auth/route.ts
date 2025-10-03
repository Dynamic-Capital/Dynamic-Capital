import { withApiMetrics } from "@/observability/server-metrics.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";
import { cookies } from "next/headers";

import { ROUTE_GUARD_COOKIE_NAME, tokenMatchesSecret } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApiMetrics(req, "/api/check-auth", async () => {
    const secret = process.env.ROUTE_GUARD_PASSWORD;

    if (!secret) {
      return jsonResponse(
        { ok: false, error: "Route guard password is not configured" },
        { status: 500 },
        req,
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(ROUTE_GUARD_COOKIE_NAME)?.value;

    if (!token || !tokenMatchesSecret(token, secret)) {
      return jsonResponse(
        { ok: false, authenticated: false },
        { status: 401 },
        req,
      );
    }

    return jsonResponse({ ok: true, authenticated: true }, {}, req);
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = (req: Request) => methodNotAllowed(req);
export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req, "GET") });
}
