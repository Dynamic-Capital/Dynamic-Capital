type NodeProcessLike = {
  env?: Record<string, string | undefined>;
};

type DenoEnvNamespace = {
  env?: {
    get?: (key: string) => string | undefined;
  };
};

type GlobalWithRuntimes = typeof globalThis & {
  process?: NodeProcessLike;
  Deno?: DenoEnvNamespace;
};

const runtimeGlobal = globalThis as GlobalWithRuntimes;

const nodeProcess = runtimeGlobal.process;

const denoEnv = runtimeGlobal.Deno?.env;

export const COMMIT_ENV_KEYS = [
  "NEXT_PUBLIC_COMMIT_SHA",
  "COMMIT_SHA",
  "GIT_COMMIT_SHA",
  "GIT_COMMIT",
  "VERCEL_GIT_COMMIT_SHA",
  "SOURCE_VERSION",
  "DIGITALOCEAN_GIT_COMMIT_SHA",
  "DIGITALOCEAN_DEPLOYMENT_ID",
  "DIGITALOCEAN_APP_DEPLOYMENT_SHA",
  "RENDER_GIT_COMMIT",
  "HEROKU_SLUG_COMMIT",
] as const;

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
  if (!value || value === "undefined" || value === "null") {
    return undefined;
  }
  return value;
}

let cachedCommit: string | undefined;

export function getCommitSha(): string {
  if (cachedCommit) return cachedCommit;

  for (const key of COMMIT_ENV_KEYS) {
    const candidate = normalizeCommit(readEnv(key));
    if (candidate) {
      cachedCommit = candidate;
      return candidate;
    }
  }

  cachedCommit = "dev";
  return cachedCommit;
}

export function healthPayload() {
  return { status: "ok", commit: getCommitSha() } as const;
}
