import { withApiMetrics } from "@/observability/server-metrics.ts";
import { corsHeaders, jsonResponse, methodNotAllowed } from "@/utils/http.ts";

interface ApiResponse {
  message: string;
}

export const dynamic = "force-dynamic";

type RouteContext = { params: { slug?: string[] } };

const isRootRequest = (params?: { slug?: string[] }) =>
  !params?.slug || params.slug.length === 0;

const notFound = () => new Response(null, { status: 404 });

export async function GET(req: Request, context: RouteContext) {
  if (!isRootRequest(context.params)) {
    return notFound();
  }

  return withApiMetrics(req, "/api", async () => {
    const body: ApiResponse = { message: "API is running" };
    return jsonResponse(body, {}, req);
  });
}

const methodNotAllowedForRoute = (req: Request, context: RouteContext) => {
  if (!isRootRequest(context.params)) {
    return notFound();
  }
  return methodNotAllowed(req);
};

export const POST = methodNotAllowedForRoute;
export const PUT = methodNotAllowedForRoute;
export const PATCH = methodNotAllowedForRoute;
export const DELETE = methodNotAllowedForRoute;
export const HEAD = methodNotAllowedForRoute;

export function OPTIONS(req: Request, context: RouteContext) {
  if (!isRootRequest(context.params)) {
    return notFound();
  }
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
