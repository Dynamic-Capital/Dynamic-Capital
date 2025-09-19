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

const PRODUCTION_ORIGIN = 'https://dynamic-capital-qazf2.ondigitalocean.app';
const PRODUCTION_ALLOWED_ORIGINS = [
  'https://dynamic-capital-qazf2.ondigitalocean.app',
  'https://dynamic-capital.vercel.app',
  'https://dynamic-capital.lovable.app',
].join(',');
const resolvedOrigin =
  process.env.LOVABLE_ORIGIN ||
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  PRODUCTION_ORIGIN;

banner(
  'Codex CLI · Friendly Dev Mode',
  'Configuring the Lovable workspace with emoji-powered feedback.',
);
info(`Resolved origin preference: ${resolvedOrigin}`);

const defaultedKeys = [];
for (const key of [
  'SITE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'MINIAPP_ORIGIN',
]) {
  if (!process.env[key]) {
    process.env[key] = resolvedOrigin;
    defaultedKeys.push(`${key} → ${resolvedOrigin}`);
  }
}

if (!process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS = PRODUCTION_ALLOWED_ORIGINS;
  defaultedKeys.push(`ALLOWED_ORIGINS → ${PRODUCTION_ALLOWED_ORIGINS}`);
}

if (defaultedKeys.length > 0) {
  warn('Origin variables were missing. Filling them with defaults so previews stay happy.', {
    details: defaultedKeys,
  });
} else {
  success('All origin-related environment variables were already set. Nice!');
}

if (!process.env.LOVABLE_ORIGIN) {
  process.env.LOVABLE_ORIGIN = resolvedOrigin;
  note(`LOVABLE_ORIGIN defaulted to ${resolvedOrigin} for local previews.`);
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
  warn(
    'Supabase credentials were not found. Using placeholder values; database-powered features may be limited.',
    { details: supabaseFallbacks },
  );
}

divider();
step('Running friendly preflight checks...');

try {
  info('Validating required environment variables...');
  execSync('npx tsx scripts/check-env.ts', { stdio: 'inherit' });
  success('Environment bootstrap complete.');

  if (supabaseFallbacks.length === 0) {
    try {
      info('Checking Supabase connectivity just in case...');
      const deno = execSync('bash scripts/deno_bin.sh').toString().trim();
      execSync(`${deno} run -A scripts/check-supabase-connectivity.ts`, {
        stdio: 'inherit',
      });
      success('Supabase connectivity looks good.');
    } catch (err) {
      warn('Supabase connectivity check failed (continuing).', {
        details: err?.message ? [err.message] : undefined,
      });
    }
  } else {
    note('Skipping Supabase connectivity check while placeholder credentials are in use.');
  }
} catch (error) {
  logError('Preflight checks failed. Please resolve the issue above.', {
    details: error?.message ? [error.message] : undefined,
  });
  process.exit(1);
}

if (process.env.CI === '1') {
  warn('CI environment detected; skipping dev server start to keep pipelines tidy.');
  process.exit(0);
}

divider();
step('Starting the development servers...');

// Start Next.js dev server in background
info('Starting Next.js dev server on port 3000...');
const { spawn } = await import('node:child_process');

const nextProcess = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
  cwd: 'apps/web',
  stdio: 'pipe',
  env: { ...process.env }
});

let nextReady = false;

// Monitor Next.js server startup
nextProcess.stdout?.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Local:') || output.includes('Ready')) {
    if (!nextReady) {
      nextReady = true;
      success('Next.js dev server is ready!');
      
      // Start Vite proxy server after Next.js is ready
      setTimeout(() => {
        info('Starting Vite proxy server on port 8080...');
        note('Tip: Your app will be available at http://localhost:8080');
        celebrate('Happy coding! Vite will proxy requests to Next.js.');
        
        try {
          execSync('vite dev', { stdio: 'inherit' });
        } catch (error) {
          logError('Vite server failed to start', {
            details: error?.message ? [error.message] : undefined,
          });
        }
      }, 1000);
    }
  }
  // Forward Next.js logs with prefix
  process.stdout.write(`[Next.js] ${output}`);
});

nextProcess.stderr?.on('data', (data) => {
  process.stderr.write(`[Next.js] ${data}`);
});

// Handle process cleanup
process.on('SIGINT', () => {
  info('Shutting down development servers...');
  nextProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextProcess.kill('SIGTERM');
  process.exit(0);
});
