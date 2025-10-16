import { corsHeaders, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string[] };

type GuardedHandler = (
  req: Request,
  slug: string[],
) => Promise<Response> | Response;

const notFound = () => new Response(null, { status: 404 });

const withSlugGuard =
  (handler: GuardedHandler) =>
  async (req: Request, context: { params: Promise<RouteParams> }) => {
    const { slug } = await context.params;
    if (!slug || slug.length === 0) {
      return notFound();
    }
    return handler(req, slug);
  };

const methodNotAllowedForRoute = withSlugGuard((req) => methodNotAllowed(req));

export const GET = withSlugGuard(() => notFound());
export const HEAD = withSlugGuard(() => new Response(null, { status: 404 }));
export const POST = methodNotAllowedForRoute;
export const PUT = methodNotAllowedForRoute;
export const PATCH = methodNotAllowedForRoute;
export const DELETE = methodNotAllowedForRoute;

export const OPTIONS = withSlugGuard((req) => {
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
});
