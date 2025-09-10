import { jsonResponse, methodNotAllowed } from '../../lib/http.ts';

interface ApiResponse {
  message: string;
}

export async function GET() {
  const body: ApiResponse = { message: 'API is running' };
  return jsonResponse(body);
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
