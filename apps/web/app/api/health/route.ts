import { corsHeaders, jsonResponse, methodNotAllowed } from '@/utils/http.ts';
import { getEnvVar } from '@/utils/env.ts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COMMIT_ENV_KEYS = [
  'NEXT_PUBLIC_COMMIT_SHA',
  'COMMIT_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'GITHUB_SHA',
] as const;

function resolveCommitSha(): string {
  const [primary, ...aliases] = COMMIT_ENV_KEYS;
  return getEnvVar(primary, aliases) ?? 'dev';
}

export function GET(req: Request) {
  const body = {
    status: 'ok' as const,
    commit: resolveCommitSha(),
  };

  return jsonResponse(
    body,
    { headers: { 'cache-control': 'no-store' } },
    req,
  );
}

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, 'GET');
  return new Response(null, { status: 204, headers });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
