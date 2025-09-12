import { execSync } from 'node:child_process';
import { cp, rm, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const copyOnly = process.argv.includes('--copy-only') || process.env.SKIP_NEXT_BUILD === '1';

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
const nextServerApp = join(root, '.next', 'server', 'app');
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

async function copyAssets() {
  // Remove existing destination
  await rm(destRoot, { recursive: true, force: true });
  await mkdir(destRoot, { recursive: true });

  // Copy static assets if present
  if (await exists(nextStatic)) {
    await cp(nextStatic, join(destRoot, 'static'), { recursive: true });
  } else {
    console.warn('⚠️  No static assets found at', nextStatic);
  }

  if (await exists(nextServerApp)) {
    await cp(nextServerApp, join(destRoot, 'server', 'app'), { recursive: true });
  } else {
    console.warn('⚠️  No server/app directory found at', nextServerApp);
  }

  console.log('✅ Copied Next.js build output to', destRoot);
}

copyAssets().catch((err) => {
  console.error('❌ Failed to copy static assets:', err);
  process.exit(1);
});

