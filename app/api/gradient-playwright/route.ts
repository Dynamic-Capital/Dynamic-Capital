import { jsonResponse, methodNotAllowed } from '../../../lib/httpResponse';
import { corsHeaders } from '../../../lib/cors';
import { gradientInference } from '../../../integrations/gradient-playwright/client.ts';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = await gradientInference(prompt);
  return jsonResponse(result, {}, req);
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
