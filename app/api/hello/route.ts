import {
  jsonResponse,
  methodNotAllowed,
  corsHeaders,
} from '../../../utils/http';

interface HelloResponse {
  message: string;
}

export const dynamic = 'force-static';

export async function GET(req: Request) {
  const body: HelloResponse = { message: 'Hello from the API' };
  return jsonResponse(body, {}, req);
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
