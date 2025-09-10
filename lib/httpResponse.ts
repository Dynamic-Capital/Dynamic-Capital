// Lightweight helpers for constructing HTTP responses
import { corsHeaders } from './cors';

export function jsonResponse(
  data: unknown,
  init: ResponseInit = {},
  req?: Request,
) {
  const headers = {
    'content-type': 'application/json',
    ...(init.headers || {}),
    ...(req ? corsHeaders(req) : {}),
  };
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function methodNotAllowed(req?: Request) {
  return jsonResponse({ error: 'Method Not Allowed' }, { status: 405 }, req);
}
