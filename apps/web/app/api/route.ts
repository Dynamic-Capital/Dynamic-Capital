import { withApiMetrics } from "@/observability/server-metrics.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

interface ApiResponse {
  message: string;
}

export const dynamic = "force-static";

export async function GET(req: Request) {
  return withApiMetrics(req, "/api", async () => {
    const body: ApiResponse = { message: "API is running" };
    return jsonResponse(body, {}, req);
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = (req: Request) => methodNotAllowed(req);
export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
