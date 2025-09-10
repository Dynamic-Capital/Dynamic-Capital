const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function buildCorsHeaders(origin: string | null) {
  const baseHeaders = {
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  } as Record<string, string>;
  if (origin && allowedOrigins.includes(origin)) {
    baseHeaders["Access-Control-Allow-Origin"] = origin;
  }
  return baseHeaders;
}

interface HelloResponse {
  message: string;
}

interface ErrorResponse {
  error: string;
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    const body: ErrorResponse = { error: "Origin not allowed" };
    return new Response(JSON.stringify(body), { status: 403 });
  }
  try {
    const body: HelloResponse = { message: "Hello from the API" };
    return new Response(JSON.stringify(body), {
      headers: buildCorsHeaders(origin),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const body: ErrorResponse = { error: message };
    return new Response(JSON.stringify(body), {
      status: 500,
      headers: buildCorsHeaders(origin),
    });
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({}), { status: 403 });
  }
  return new Response(JSON.stringify({}), {
    headers: buildCorsHeaders(origin),
  });
}

function methodNotAllowed(request: Request) {
  const origin = request.headers.get("origin");
  const body: ErrorResponse = { error: "Method Not Allowed" };
  return new Response(JSON.stringify(body), {
    status: 405,
    headers: buildCorsHeaders(origin),
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
