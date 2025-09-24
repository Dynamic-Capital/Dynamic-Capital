import assert from 'node:assert/strict';

const modulePath = '../../apps/web/app/api/health/route.ts';
const COMMIT_ENV_KEYS = [
  'NEXT_PUBLIC_COMMIT_SHA',
  'COMMIT_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'GITHUB_SHA',
] as const;

const nodeProcess =
  typeof globalThis.process !== 'undefined'
    ? (globalThis.process as { env?: Record<string, string | undefined> })
    : undefined;

const denoEnv =
  typeof globalThis.Deno !== 'undefined' &&
  typeof globalThis.Deno.env === 'object'
    ? (globalThis.Deno.env as {
        get?(key: string): string | undefined;
        set?(key: string, value: string): void;
        delete?(key: string): void;
      })
    : undefined;

type EnvSnapshot = Record<string, string | undefined>;

function captureEnv(): EnvSnapshot {
  const snapshot: EnvSnapshot = {};
  for (const key of COMMIT_ENV_KEYS) {
    snapshot[key] = readEnv(key);
  }
  return snapshot;
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const key of COMMIT_ENV_KEYS) {
    const value = snapshot[key];
    setEnv(key, value);
  }
}

function readEnv(key: string): string | undefined {
  if (denoEnv && typeof denoEnv.get === 'function') {
    try {
      const value = denoEnv.get(key);
      if (typeof value === 'string') {
        return value;
      }
    } catch {
      // ignore permission errors
    }
  }

  if (nodeProcess?.env && typeof nodeProcess.env[key] === 'string') {
    return nodeProcess.env[key];
  }

  return undefined;
}

function setEnv(key: string, value: string | undefined) {
  if (denoEnv) {
    try {
      if (value === undefined) {
        if (typeof denoEnv.delete === 'function') {
          denoEnv.delete(key);
        } else if (typeof denoEnv.set === 'function') {
          denoEnv.set(key, '');
        }
      } else if (typeof denoEnv.set === 'function') {
        denoEnv.set(key, value);
      }
    } catch {
      // ignore permission errors
    }
  }

  if (nodeProcess?.env) {
    if (value === undefined) {
      delete nodeProcess.env[key];
    } else {
      nodeProcess.env[key] = value;
    }
  }
}

async function loadHandlers() {
  return import(/* @vite-ignore */ modulePath);
}

async function runWithCommit() {
  const snapshot = captureEnv();
  setEnv('NEXT_PUBLIC_COMMIT_SHA', 'test-sha');
  for (const key of COMMIT_ENV_KEYS) {
    if (key !== 'NEXT_PUBLIC_COMMIT_SHA') {
      setEnv(key, undefined);
    }
  }

  try {
    const { GET } = await loadHandlers();
    const res = await GET(new Request('http://localhost/api/health'));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const data = await res.json();
    assert.deepEqual(data, { status: 'ok', commit: 'test-sha' });
  } finally {
    restoreEnv(snapshot);
  }
}

async function runWithFallback() {
  const snapshot = captureEnv();
  for (const key of COMMIT_ENV_KEYS) {
    setEnv(key, undefined);
  }

  try {
    const { GET } = await loadHandlers();
    const res = await GET(new Request('http://localhost/api/health'));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const data = await res.json();
    assert.deepEqual(data, { status: 'ok', commit: 'dev' });
  } finally {
    restoreEnv(snapshot);
  }
}

if (typeof Deno !== 'undefined') {
  Deno.test('GET /api/health returns commit when configured', runWithCommit);
  Deno.test('GET /api/health falls back to dev when commit missing', runWithFallback);
} else {
  const { default: test } = await import(/* @vite-ignore */ 'node:test');
  test('GET /api/health returns commit when configured', runWithCommit);
  test('GET /api/health falls back to dev when commit missing', runWithFallback);
}
