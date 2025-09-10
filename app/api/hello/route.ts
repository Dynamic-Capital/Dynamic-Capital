interface HelloResponse {
  message: string;
}

export async function GET() {
  const body: HelloResponse = { message: 'Hello from the API' };
  return new Response(JSON.stringify(body));
}

function methodNotAllowed() {
  const body = { error: 'Method Not Allowed' };
  return new Response(JSON.stringify(body), { status: 405 });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
