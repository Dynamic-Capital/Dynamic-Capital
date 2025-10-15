import { respondWithApiStatus } from "@/app/api/_shared/api-status.ts";
import { corsHeaders, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

type RouteParams = { slug?: string[] };
type RouteContext = { params: Promise<RouteParams> };

const isRootRequest = (params?: RouteParams) =>
  !params?.slug || params.slug.length === 0;

const isRootRouteRequest = async (context: RouteContext) => {
  try {
    const params = await context.params;
    return isRootRequest(params);
  } catch {
    return true;
  }
};

const notFound = () => new Response(null, { status: 404 });

export async function GET(req: Request, context: RouteContext) {
  if (!(await isRootRouteRequest(context))) {
    return notFound();
  }

  return respondWithApiStatus(req);
}

const methodNotAllowedForRoute = async (
  req: Request,
  context: RouteContext,
) => {
  if (!(await isRootRouteRequest(context))) {
    return notFound();
  }
  return methodNotAllowed(req);
};

export const POST = methodNotAllowedForRoute;
export const PUT = methodNotAllowedForRoute;
export const PATCH = methodNotAllowedForRoute;
export const DELETE = methodNotAllowedForRoute;
export const HEAD = methodNotAllowedForRoute;

export async function OPTIONS(req: Request, context: RouteContext) {
  if (!(await isRootRouteRequest(context))) {
    return notFound();
  }
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
