import { respondWithApiStatus } from "@/app/api/_shared/api-status.ts";
import { corsHeaders, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

type RouteParams = { slug?: string[] };
type RouteContext = { params: Promise<RouteParams> };

const isRootRequest = (params: RouteParams) =>
  !params.slug || params.slug.length === 0;

const notFound = () => new Response(null, { status: 404 });

const resolveGuardedParams = async (context: RouteContext) => {
  const params = await context.params;
  if (!isRootRequest(params)) {
    return { failure: notFound() } as const;
  }

  return { params } as const;
};

export async function GET(req: Request, context: RouteContext) {
  const { failure, params } = await resolveGuardedParams(context);
  if (failure) {
    return failure;
  }

  return respondWithApiStatus(req);
}

const methodNotAllowedForRoute = async (
  req: Request,
  context: RouteContext,
) => {
  const { failure } = await resolveGuardedParams(context);
  if (failure) {
    return failure;
  }

  return methodNotAllowed(req);
};

export const POST = methodNotAllowedForRoute;
export const PUT = methodNotAllowedForRoute;
export const PATCH = methodNotAllowedForRoute;
export const DELETE = methodNotAllowedForRoute;
export const HEAD = methodNotAllowedForRoute;

export async function OPTIONS(req: Request, context: RouteContext) {
  const { failure } = await resolveGuardedParams(context);
  if (failure) {
    return failure;
  }

  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
