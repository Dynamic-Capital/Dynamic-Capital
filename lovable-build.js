#!/usr/bin/env node

import { execSync } from 'node:child_process';
import {
  banner,
  celebrate,
  divider,
  info,
  note,
  step,
  success,
  warn,
  error as logError,
} from './scripts/utils/friendly-logger.js';

const PRODUCTION_ORIGIN = 'https://dynamic-capital.lovable.app';
const resolvedOrigin =
  process.env.LOVABLE_ORIGIN ||
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  PRODUCTION_ORIGIN;

banner(
  'Codex CLI · Friendly Build Mode',
  'Running Lovable build tasks with cheerful updates.',
);
info(`Resolved origin preference: ${resolvedOrigin}`);

const defaultedKeys = [];
for (const key of [
  'SITE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'ALLOWED_ORIGINS',
  'MINIAPP_ORIGIN',
]) {
  if (!process.env[key]) {
    process.env[key] = resolvedOrigin;
    defaultedKeys.push(key);
  }
}

if (defaultedKeys.length > 0) {
  warn('Origin variables were missing. Applying the resolved origin to keep builds consistent.', {
    details: defaultedKeys.map((key) => `${key} → ${resolvedOrigin}`),
  });
} else {
  success('All origin-related environment variables are ready to go.');
}

if (!process.env.LOVABLE_ORIGIN) {
  process.env.LOVABLE_ORIGIN = resolvedOrigin;
  note(`LOVABLE_ORIGIN defaulted to ${resolvedOrigin} so previews match the build.`);
} else {
  info(`LOVABLE_ORIGIN already configured as ${process.env.LOVABLE_ORIGIN}.`);
}

const supabaseFallbacks = [];
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://stub.supabase.co';
  supabaseFallbacks.push('SUPABASE_URL → https://stub.supabase.co');
}
if (!process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = 'stub-anon-key';
  supabaseFallbacks.push('SUPABASE_ANON_KEY → stub-anon-key');
}

if (supabaseFallbacks.length > 0) {
  note('Supabase credentials are not configured; placeholder values will be used for local build helpers.', {
    details: supabaseFallbacks,
  });
}

divider();
step('Ensuring required environment variables are present...');
try {
  execSync('npx tsx scripts/check-env.ts', { stdio: 'inherit' });
  success('Environment check passed.');
} catch (error) {
  logError('Environment check failed. Fix the issues above before building.', {
    details: error?.message ? [error.message] : undefined,
  });
  process.exit(1);
}

const tasks = [
  { cmd: 'npm run build', label: 'Next.js build' },
  { cmd: 'npm run build:miniapp', label: 'Miniapp build' },
];

divider();
let exitCode = 0;
for (const { cmd, label } of tasks) {
  step(`${label} in progress...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    success(`${label} completed successfully!`);
  } catch (error) {
    logError(`${label} failed. Check the output above for details.`, {
      details: error?.message ? [error.message] : undefined,
    });
    exitCode = 1;
  }
  divider();
}

if (exitCode === 0) {
  celebrate('All Codex CLI build tasks finished with a smile!');
} else {
  warn('Some build tasks did not finish successfully. Review the logs above.');
}

process.exitCode = exitCode;
