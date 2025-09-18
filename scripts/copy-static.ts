import { execSync, spawn } from 'node:child_process';
import { cp, rm, mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const copyOnly = args.has('--copy-only') || process.env.SKIP_NEXT_BUILD === '1';

if (!process.env.DISABLE_HTTP_REDIRECTS) {
  process.env.DISABLE_HTTP_REDIRECTS = 'true';
}

if (!copyOnly) {
  // Run Next.js build to ensure latest assets
  try {
    execSync('next build', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Next.js build failed:', err);
    process.exit(1);
  }
}

const root = process.cwd();
const projectRoot = join(root, '..', '..');
const nextStatic = join(root, '.next', 'static');
const nextStandalone = join(root, '.next', 'standalone', 'apps', 'web', 'server.js');
const publicDir = join(root, 'public');
// Copy build output to a repository-level `_static` directory so the site can be
// served as a regular static site (e.g. on DigitalOcean).
const destRoot = join(projectRoot, '_static');

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithRedirects(url: string, maxRedirects = 5) {
  let currentUrl = url;
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const res = await fetch(currentUrl, { redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        return res;
      }
      const nextUrl = new URL(location, currentUrl);
      const baseUrl = new URL(currentUrl);
      nextUrl.protocol = 'http:';
      if (!nextUrl.port) {
        nextUrl.port = baseUrl.port;
      }
      if (nextUrl.hostname === 'localhost') {
        nextUrl.hostname = baseUrl.hostname;
      }
      currentUrl = nextUrl.toString();
      continue;
    }
    return res;
  }
  throw new Error(`Too many redirects while fetching ${url}`);
}

type WaitForServerOptions = {
  retries?: number;
  delayMs?: number;
  shouldAbort?: () => boolean;
  getAbortError?: () => Error | undefined;
};

async function waitForServer(url: string, options: WaitForServerOptions = {}) {
  const { retries = 50, delayMs = 200, shouldAbort, getAbortError } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (shouldAbort?.()) {
      throw getAbortError?.() ?? new Error(`Aborted while waiting for ${url}`);
    }
    try {
      const res = await fetchWithRedirects(url);
      if (res.ok) {
        return;
      }
    } catch {
      // retry until timeout
    }
    if (shouldAbort?.()) {
      throw getAbortError?.() ?? new Error(`Aborted while waiting for ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw getAbortError?.() ?? new Error(`Timed out waiting for Next.js server at ${url}`);
}

async function fetchHtml(url: string) {
  const res = await fetchWithRedirects(url);
  if (!res.ok && res.status !== 404) {
    throw new Error(`Unexpected status ${res.status} fetching ${url}`);
  }
  return await res.text();
}

async function startServerAndCapture() {
  const port = Number(process.env.STATIC_EXPORT_PORT || 4123);
  const baseUrl = `http://127.0.0.1:${port}`;

  let serverCwd = join(root, '.next', 'standalone');
  let command = 'node';
  let args = [nextStandalone];

  if (!(await exists(nextStandalone))) {
    const nextExecutableName = process.platform === 'win32' ? 'next.cmd' : 'next';
    const nextExecutable = join(projectRoot, 'node_modules', '.bin', nextExecutableName);
    const resolvedCommand = (await exists(nextExecutable)) ? nextExecutable : nextExecutableName;

    console.warn(
      '⚠️  Next.js standalone server not found; falling back to `next start` for snapshot capture.',
    );

    command = resolvedCommand;
    args = ['start', '-p', String(port), '-H', '127.0.0.1'];
    serverCwd = root;
  }

  const server = spawn(command, args, {
    cwd: serverCwd,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      DISABLE_HTTP_REDIRECTS: 'true',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  let shuttingDown = false;
  let serverExited = false;
  let exitError: Error | undefined;

  const exitPromise = new Promise<void>((resolve) => {
    server.once('exit', (code, signal) => {
      if (!shuttingDown) {
        serverExited = true;
        exitError =
          exitError ??
          new Error(
            `Next.js server exited before it became ready (code: ${code ?? 'null'}, signal: ${
              signal ?? 'null'
            }).`,
          );
      }
      resolve();
    });
  });

  server.once('error', (err) => {
    if (shuttingDown) {
      return;
    }
    serverExited = true;
    exitError = err instanceof Error ? err : new Error(String(err));
  });

  try {
    await waitForServer(`${baseUrl}/healthz`, {
      retries: 75,
      delayMs: 200,
      shouldAbort: () => serverExited,
      getAbortError: () =>
        exitError ?? new Error(`Next.js server exited before ${baseUrl}/healthz responded.`),
    });

    const indexHtml = await fetchHtml(`${baseUrl}/`);
    await writeFile(join(destRoot, 'index.html'), indexHtml, 'utf8');

    const notFoundHtml = await fetchHtml(`${baseUrl}/__static-not-found`);
    await writeFile(join(destRoot, '404.html'), notFoundHtml, 'utf8');
  } finally {
    shuttingDown = true;
    if (!server.killed) {
      server.kill('SIGTERM');
    }
    await exitPromise;
  }
}

async function copyAssets() {
  // Reset destination directory to ensure no stale files linger
  await rm(destRoot, { recursive: true, force: true });
  await mkdir(destRoot, { recursive: true });

  if (await exists(nextStatic)) {
    await mkdir(join(destRoot, '_next'), { recursive: true });
    await cp(nextStatic, join(destRoot, '_next', 'static'), { recursive: true });
  } else {
    console.warn('⚠️  No static assets found at', nextStatic);
  }

  if (await exists(publicDir)) {
    await cp(publicDir, destRoot, { recursive: true });
  }

  await startServerAndCapture();

  console.log('✅ Exported landing snapshot to', destRoot);
}

copyAssets().catch((err) => {
  console.error('❌ Failed to copy static assets:', err);
  process.exit(1);
});

