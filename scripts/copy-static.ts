import { execSync } from 'node:child_process';
import { cp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const copyOnly = process.argv.includes('--copy-only');

if (!copyOnly) {
  // Run Next.js build to ensure latest assets
  execSync('next build', { stdio: 'inherit' });
}

const root = process.cwd();
const nextStatic = join(root, '.next', 'static');
const nextServerApp = join(root, '.next', 'server', 'app');
const destRoot = join(root, 'supabase', 'functions', '_static');

async function copyAssets() {
  // Remove existing destination
  await rm(destRoot, { recursive: true, force: true });
  await mkdir(destRoot, { recursive: true });

  // Copy static assets
  await cp(nextStatic, join(destRoot, 'static'), { recursive: true });
  await cp(nextServerApp, join(destRoot, 'server', 'app'), { recursive: true });

  console.log('✅ Copied Next.js build output to', destRoot);
}

copyAssets().catch((err) => {
  console.error('❌ Failed to copy static assets:', err);
  process.exit(1);
});

