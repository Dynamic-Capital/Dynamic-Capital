import { respondWithApiStatus } from "@/app/api/_shared/api-status.ts";
import { corsHeaders, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

type RouteParams = { slug?: string[] };
type GuardedHandler = (
  req: Request,
  params: RouteParams,
) => Promise<Response> | Response;

const isRootRequest = (params: RouteParams) =>
  !params.slug || params.slug.length === 0;

const notFound = () => new Response(null, { status: 404 });

const resolveGuardedParams = async (paramsPromise: Promise<RouteParams>) => {
  const params = await paramsPromise;
  if (!isRootRequest(params)) {
    return { failure: notFound() } as const;
  }

  return { params } as const;
};

const withRootGuard =
  (handler: GuardedHandler) =>
  async (req: Request, context: { params: Promise<RouteParams> }) => {
    const result = await resolveGuardedParams(context.params);
    if ("failure" in result) {
      return result.failure;
    }

    return handler(req, result.params);
  };

const methodNotAllowedForRoute = withRootGuard((req) => methodNotAllowed(req));

export const GET = withRootGuard((req) => respondWithApiStatus(req));
export const POST = methodNotAllowedForRoute;
export const PUT = methodNotAllowedForRoute;
export const PATCH = methodNotAllowedForRoute;
export const DELETE = methodNotAllowedForRoute;
export const HEAD = methodNotAllowedForRoute;

export const OPTIONS = withRootGuard((req) => {
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
});
