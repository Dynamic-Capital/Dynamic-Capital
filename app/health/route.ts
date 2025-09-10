import { jsonResponse, methodNotAllowed } from '../lib/httpResponse';

export async function GET() {
  return jsonResponse({ status: 'ok' });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
