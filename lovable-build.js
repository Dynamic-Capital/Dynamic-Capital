#!/usr/bin/env node

import { execSync } from 'node:child_process';

console.log('🔧 Running Lovable build tasks...');

// Sync and ensure required environment variables are present
try {
  execSync('npx tsx scripts/sync-env.ts', { stdio: 'inherit' });
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
