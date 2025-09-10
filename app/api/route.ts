interface ApiResponse {
  message: string;
}

export async function GET() {
  const body: ApiResponse = { message: 'API is running' };
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
