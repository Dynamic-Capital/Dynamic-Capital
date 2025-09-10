// Lightweight helpers for constructing HTTP responses
export function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export function methodNotAllowed() {
  return jsonResponse({ error: 'Method Not Allowed' }, { status: 405 });
}
