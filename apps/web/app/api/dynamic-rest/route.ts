import { withApiMetrics } from "@/observability/server-metrics.ts";
import { buildDynamicRestResponse } from "@/services/dynamic-rest";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

const ROUTE_NAME = "/api/dynamic-rest";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    const payload = buildDynamicRestResponse();
    return jsonResponse(payload, {}, req);
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
