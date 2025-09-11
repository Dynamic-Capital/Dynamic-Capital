const rawAllowedOrigins =
  typeof Deno !== 'undefined'
    ? Deno.env.get('ALLOWED_ORIGINS')
    : typeof process !== 'undefined'
    ? process.env.ALLOWED_ORIGINS
    : undefined;

const allowedOrigins = (rawAllowedOrigins || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function buildCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':
      'authorization, x-client-info, apikey, content-type',
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

export function corsHeaders(req: Request) {
  return buildCorsHeaders(req.headers.get('origin'));
}

export function jsonResponse(
  data: unknown,
  init: ResponseInit = {},
  req?: Request,
) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    ...(init.headers as Record<string, string> | undefined),
    ...(req ? corsHeaders(req) : {}),
  };
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function json(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
  req?: Request,
) {
  return jsonResponse(data, { status, headers: extra }, req);
}

export const ok = (data: unknown = {}, req?: Request) =>
  jsonResponse(
    { ok: true, ...((typeof data === 'object' && data) || {}) },
    { status: 200 },
    req,
  );

export const bad = (
  message = 'Bad Request',
  hint?: unknown,
  req?: Request,
) => jsonResponse({ ok: false, error: message, hint }, { status: 400 }, req);

export const unauth = (message = 'Unauthorized', req?: Request) =>
  jsonResponse({ ok: false, error: message }, { status: 401 }, req);

export const nf = (message = 'Not Found', req?: Request) =>
  jsonResponse({ ok: false, error: message }, { status: 404 }, req);

export const methodNotAllowed = (req?: Request) =>
  jsonResponse({ error: 'Method Not Allowed' }, { status: 405 }, req);

export const mna = () =>
  jsonResponse({ ok: false, error: 'Method Not Allowed' }, { status: 405 });

export const oops = (message: string, hint?: unknown, req?: Request) =>
  jsonResponse({ ok: false, error: message, hint }, { status: 500 }, req);
