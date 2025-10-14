import { respondWithApiStatus } from "@/app/api/_shared/api-status.ts";
import { corsHeaders, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return respondWithApiStatus(req);
}

const methodNotAllowedForRoute = (req: Request) => methodNotAllowed(req);

export const POST = methodNotAllowedForRoute;
export const PUT = methodNotAllowedForRoute;
export const PATCH = methodNotAllowedForRoute;
export const DELETE = methodNotAllowedForRoute;
export const HEAD = methodNotAllowedForRoute;

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, "GET");
  return new Response(null, { status: 204, headers });
}
