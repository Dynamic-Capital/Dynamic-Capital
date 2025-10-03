import { withApiMetrics } from "@/observability/server-metrics.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";
import { healthPayload } from "@/utils/commit.ts";

export const dynamic = "force-dynamic";

const payload = healthPayload();

export function GET(req: Request) {
  return withApiMetrics(
    req,
    "/api/health",
    async () => jsonResponse(payload, {}, req),
  );
}

export function HEAD() {
  return new Response(null, { status: 204 });
}

export function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req, "GET"),
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
