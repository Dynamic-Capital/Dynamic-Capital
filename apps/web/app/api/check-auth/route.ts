import { withApiMetrics } from "@/observability/server-metrics.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";
import { cookies } from "next/headers";

import { ROUTE_GUARD_COOKIE_NAME, tokenMatchesSecret } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApiMetrics(req, "/api/check-auth", async () => {
    const secret = process.env.ROUTE_GUARD_PASSWORD;
    const noStoreHeaders = { "cache-control": "no-store" } as const;

    if (!secret) {
      return jsonResponse(
        {
          ok: true,
          authenticated: true,
          passwordRequired: false,
        },
        { headers: noStoreHeaders },
        req,
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(ROUTE_GUARD_COOKIE_NAME)?.value;

    if (!token || !tokenMatchesSecret(token, secret)) {
      return jsonResponse(
        { ok: false, authenticated: false, passwordRequired: true },
        { status: 401, headers: noStoreHeaders },
        req,
      );
    }

    return jsonResponse(
      { ok: true, authenticated: true, passwordRequired: true },
      { headers: noStoreHeaders },
      req,
    );
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
