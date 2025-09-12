// Access Node's process via globalThis to avoid TypeScript errors when `process`
// is not defined (e.g. in Deno environments)
const nodeProcess = (globalThis as any).process as
  | { env?: Record<string, string | undefined> }
  | undefined;

const rawAllowedOrigins =
  'Deno' in globalThis
    ? (globalThis as any).Deno.env.get('ALLOWED_ORIGINS')
    : nodeProcess?.env?.ALLOWED_ORIGINS;

let allowedOrigins: string[];

if (rawAllowedOrigins === undefined) {
  console.warn('[CORS] ALLOWED_ORIGINS is missing; allowing all origins');
  allowedOrigins = ['*'];
} else {
  allowedOrigins = rawAllowedOrigins
    .split(',')
    .map((o: string) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    console.warn('[CORS] ALLOWED_ORIGINS is empty; allowing all origins');
    allowedOrigins = ['*'];
  }
}

export function buildCorsHeaders(origin: string | null, methods?: string) {
  const headers: Record<string, string> = {
    'access-control-allow-headers':
      'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods':
      methods || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  };
  if (allowedOrigins.includes('*')) {
    headers['access-control-allow-origin'] = '*';
  } else if (origin && allowedOrigins.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

export function corsHeaders(req: Request, methods?: string) {
  return buildCorsHeaders(req.headers.get('origin'), methods);
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
