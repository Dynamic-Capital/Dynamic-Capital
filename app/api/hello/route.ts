import { jsonResponse, methodNotAllowed } from '../../../lib/http.ts';

interface HelloResponse {
  message: string;
}

export async function GET() {
  const body: HelloResponse = { message: 'Hello from the API' };
  return jsonResponse(body);
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
