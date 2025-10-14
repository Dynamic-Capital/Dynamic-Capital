import { respondWithApiStatus } from "@/app/api/_shared/api-status.ts";
import { corsHeaders, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

type RouteContext = { params: { slug?: string[] } };

const isRootRequest = (params?: { slug?: string[] }) =>
  !params?.slug || params.slug.length === 0;

const notFound = () => new Response(null, { status: 404 });

export async function GET(req: Request, context: RouteContext) {
  if (!isRootRequest(context.params)) {
    return notFound();
  }

  return respondWithApiStatus(req);
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
