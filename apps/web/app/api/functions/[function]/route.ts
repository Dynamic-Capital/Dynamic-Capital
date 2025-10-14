import { SUPABASE_CONFIG } from "@/config/supabase";
import { proxySupabaseEdgeFunction } from "../../_shared/supabase";

type RouteParams = {
  params: { function: string };
};

const ALLOWED_FUNCTION_PATHS = new Set<string>(
  Object.values(SUPABASE_CONFIG.FUNCTIONS),
);

type AllowedFunctionPath =
  (typeof SUPABASE_CONFIG.FUNCTIONS)[keyof typeof SUPABASE_CONFIG.FUNCTIONS];

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

async function handle(
  request: Request,
  method: string,
  { params }: RouteParams,
): Promise<Response> {
  const functionPath = params.function;

  if (!isAllowedFunction(functionPath)) {
    return buildNotFoundResponse();
  }

  return await proxySupabaseEdgeFunction({
    request,
    path: functionPath,
    method,
    context: `${method} /api/functions/${functionPath}`,
    cache: request.cache,
    headers: request.headers,
  });
}

export async function GET(request: Request, context: RouteParams) {
  return await handle(request, "GET", context);
}

export async function POST(request: Request, context: RouteParams) {
  return await handle(request, "POST", context);
}

export async function PUT(request: Request, context: RouteParams) {
  return await handle(request, "PUT", context);
}

export async function PATCH(request: Request, context: RouteParams) {
  return await handle(request, "PATCH", context);
}

export async function DELETE(request: Request, context: RouteParams) {
  return await handle(request, "DELETE", context);
}

export async function OPTIONS(request: Request, context: RouteParams) {
  return await handle(request, "OPTIONS", context);
}
