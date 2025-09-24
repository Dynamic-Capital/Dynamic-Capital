const nodeProcess = (globalThis as any).process as
  | { env?: Record<string, string | undefined> }
  | undefined;

const denoEnv = 'Deno' in globalThis
  ? ((globalThis as any).Deno?.env as { get?: (key: string) => string | undefined })
  : undefined;

const commitEnvOrder = [
  'COMMIT_SHA',
  'NEXT_PUBLIC_COMMIT_SHA',
  'GIT_COMMIT_SHA',
  'GIT_COMMIT',
  'VERCEL_GIT_COMMIT_SHA',
  'SOURCE_VERSION',
  'DIGITALOCEAN_GIT_COMMIT_SHA',
  'DIGITALOCEAN_DEPLOYMENT_ID',
  'DIGITALOCEAN_APP_DEPLOYMENT_SHA',
  'RENDER_GIT_COMMIT',
  'HEROKU_SLUG_COMMIT',
];

function readEnv(key: string): string | undefined {
  const fromDeno = denoEnv?.get?.(key);
  if (fromDeno && fromDeno.trim()) {
    return fromDeno;
  }
  const fromNode = nodeProcess?.env?.[key];
  if (fromNode && `${fromNode}`.trim()) {
    return fromNode;
  }
  return undefined;
}

function normalizeCommit(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value || value === 'undefined' || value === 'null') {
    return undefined;
  }
  return value;
}

let cachedCommit: string | undefined;

export function getCommitSha(): string {
  if (cachedCommit) return cachedCommit;

  for (const key of commitEnvOrder) {
    const candidate = normalizeCommit(readEnv(key));
    if (candidate) {
      cachedCommit = candidate;
      return candidate;
    }
  }

  cachedCommit = 'unknown';
  return cachedCommit;
}

export function healthPayload() {
  return { status: 'ok', commit: getCommitSha() } as const;
}
