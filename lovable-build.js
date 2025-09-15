#!/usr/bin/env node

import { execSync } from 'node:child_process';

const PRODUCTION_ORIGIN = 'https://dynamic-capital.ondigitalocean.app';
const resolvedOrigin =
  process.env.LOVABLE_ORIGIN ||
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  PRODUCTION_ORIGIN;

for (const key of [
  'SITE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'ALLOWED_ORIGINS',
  'MINIAPP_ORIGIN',
]) {
  if (!process.env[key]) {
    process.env[key] = resolvedOrigin;
  }
}

if (!process.env.LOVABLE_ORIGIN) {
  process.env.LOVABLE_ORIGIN = resolvedOrigin;
}

console.log('🔧 Running Lovable build tasks...');
console.log(`📡 Using origin ${resolvedOrigin} for Lovable build.`);

// Ensure required environment variables are present
try {
  execSync('npx tsx scripts/check-env.ts', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Environment check failed:', error.message);
  process.exit(1);
}

const tasks = [
  { cmd: 'npm run build', label: 'Next.js build' },
  { cmd: 'npm run build:miniapp', label: 'Miniapp build' }
];

let exitCode = 0;
for (const { cmd, label } of tasks) {
  console.log(`\n🔨 ${label}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ ${label} completed successfully!`);
  } catch (error) {
    console.error(`❌ ${label} failed:`, error.message);
    exitCode = 1;
  }
}

process.exitCode = exitCode;
