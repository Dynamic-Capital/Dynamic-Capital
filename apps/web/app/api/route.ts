import { respondWithApiStatus } from "@/app/api/_shared/api-status.ts";
import { corsHeaders, methodNotAllowed } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return respondWithApiStatus(req);
}

export function HEAD() {
  return new Response(null, { status: 204 });
}

export function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req, "GET"),
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
