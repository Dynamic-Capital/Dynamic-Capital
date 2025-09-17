import { execSync, spawn } from 'node:child_process';
import { cp, rm, mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const copyOnly = args.has('--copy-only') || process.env.SKIP_NEXT_BUILD === '1';

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

async function waitForServer(url: string, retries = 50, delayMs = 200) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok) {
        return;
      }
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

async function fetchHtml(url: string, depth = 0): Promise<string> {
  const res = await fetch(url, { redirect: 'manual' });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    if (!location) {
      throw new Error(`Redirect without location header fetching ${url}`);
    }
    if (depth > 5) {
      throw new Error(`Too many redirects fetching ${url}`);
    }
    const nextUrl = new URL(location, url).toString();
    return fetchHtml(nextUrl, depth + 1);
  }

  if (!res.ok && res.status !== 404) {
    throw new Error(`Unexpected status ${res.status} fetching ${url}`);
  }

  return await res.text();
}

async function startServerAndCapture() {
  if (!(await exists(nextStandalone))) {
    throw new Error('Next.js standalone server not found. Run `next build` first.');
  }

  const port = Number(process.env.STATIC_EXPORT_PORT || 4123);
  const server = spawn('node', [nextStandalone], {
    cwd: join(root, '.next', 'standalone'),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      STATIC_EXPORT: '1',
      NEXT_PUBLIC_STATIC_EXPORT: '1',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/healthz`);
    const indexHtml = await fetchHtml(`http://127.0.0.1:${port}/`);
    await writeFile(join(destRoot, 'index.html'), indexHtml, 'utf8');

    const notFoundHtml = await fetchHtml(`http://127.0.0.1:${port}/__static-not-found`);
    await writeFile(join(destRoot, '404.html'), notFoundHtml, 'utf8');
  } finally {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
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

