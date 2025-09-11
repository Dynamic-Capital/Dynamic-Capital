import {
  jsonResponse,
  methodNotAllowed,
  corsHeaders,
} from '../../utils/http';

interface ApiResponse {
  message: string;
}

export const dynamic = 'force-static';

export async function GET(req: Request) {
  const body: ApiResponse = { message: 'API is running' };
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
