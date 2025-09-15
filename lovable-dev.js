#!/usr/bin/env node
import { execSync } from 'node:child_process';

console.log('🔧 Preparing Lovable dev environment...');

try {
  execSync('npx tsx scripts/check-env.ts', { stdio: 'inherit' });
  try {
    const deno = execSync('bash scripts/deno_bin.sh').toString().trim();
    execSync(`${deno} run -A scripts/check-supabase-connectivity.ts`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️  Supabase connectivity check failed (continuing):', err.message);
  }
} catch (error) {
  console.error('❌ Preflight checks failed:', error.message);
  process.exit(1);
}

if (process.env.CI === '1') {
  console.log('CI environment detected; skipping dev server start.');
  process.exit(0);
}

console.log('\n🚀 Starting Next.js dev server...');
execSync('npm run dev', { stdio: 'inherit' });
