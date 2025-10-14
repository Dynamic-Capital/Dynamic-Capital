import { SUPABASE_CONFIG } from "@/config/supabase";
import { proxySupabaseEdgeFunction } from "../../_shared/supabase";

type RouteParams = { function?: string | string[] };

type RouteHandlerContext = {
  params: Promise<RouteParams | undefined>;
};

const ALLOWED_FUNCTION_PATHS = new Set<string>(
  Object.values(SUPABASE_CONFIG.FUNCTIONS),
);

type AllowedFunctionPath =
  (typeof SUPABASE_CONFIG.FUNCTIONS)[keyof typeof SUPABASE_CONFIG.FUNCTIONS];

const HANDLED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
] as const;

type HandledMethod = (typeof HANDLED_METHODS)[number];

function isAllowedFunction(path: string): path is AllowedFunctionPath {
  return ALLOWED_FUNCTION_PATHS.has(path);
}

function buildNotFoundResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Supabase function not found" }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function normalizeFunctionParam(
  functionParam: string | readonly string[] | undefined,
): string | null {
  if (!functionParam) {
    return null;
  }

  const value = Array.isArray(functionParam) ? functionParam[0] : functionParam;

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function proxySupabaseFunction(
  request: Request,
  context: RouteHandlerContext,
  method: HandledMethod,
): Promise<Response> {
  const params = await context.params;
  const normalizedFunctionPath = normalizeFunctionParam(params?.function);

  if (!normalizedFunctionPath || !isAllowedFunction(normalizedFunctionPath)) {
    return buildNotFoundResponse();
  }

  return proxySupabaseEdgeFunction({
    request,
    path: normalizedFunctionPath,
    method,
    context: `${method} /api/functions/${normalizedFunctionPath}`,
    cache: request.cache,
    headers: request.headers,
  });
}

type RouteHandler = (
  request: Request,
  context: RouteHandlerContext,
) => Promise<Response>;

function createRouteHandler(method: HandledMethod): RouteHandler {
  return async (request, context) =>
    proxySupabaseFunction(request, context, method);
}

export const GET = createRouteHandler("GET");
export const HEAD = createRouteHandler("HEAD");
export const POST = createRouteHandler("POST");
export const PUT = createRouteHandler("PUT");
export const PATCH = createRouteHandler("PATCH");
export const DELETE = createRouteHandler("DELETE");
export const OPTIONS = createRouteHandler("OPTIONS");
