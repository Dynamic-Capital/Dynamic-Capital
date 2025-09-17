import test from 'node:test';
import { equal as assertEqual } from 'node:assert/strict';
import { freshImport } from './utils/freshImport.ts';

const importNodeEnv = async () => {
  const moduleUrl = new URL('../apps/web/config/node-env.ts', import.meta.url);
  return await freshImport(moduleUrl);
};

async function withEnv(
  values: Record<string, string | undefined>,
  run: () => Promise<void>,
) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withNodeEnv(value: string | undefined, run: () => Promise<void>) {
  await withEnv({ NODE_ENV: value }, run);
}

test('defaults to development when NODE_ENV missing', async () => {
  await withNodeEnv(undefined, async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, 'development');
    assertEqual(mod.isDevelopment, true);
    assertEqual(mod.isProduction, false);
    assertEqual(mod.isTest, false);
  });
});

test('recognizes production NODE_ENV', async () => {
  await withNodeEnv('production', async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, 'production');
    assertEqual(mod.isProduction, true);
    assertEqual(mod.isDevelopment, false);
  });
});

test('unknown NODE_ENV values fallback to development', async () => {
  await withNodeEnv('staging', async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, 'development');
    assertEqual(mod.isDevelopment, true);
  });
});

test('recognizes test NODE_ENV values regardless of casing', async () => {
  await withNodeEnv(' TEST ', async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, 'test');
    assertEqual(mod.isTest, true);
  });
});

test('falls back to VERCEL_ENV when NODE_ENV missing', async () => {
  await withEnv({ NODE_ENV: undefined, VERCEL_ENV: 'production' }, async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, 'production');
    assertEqual(mod.isProduction, true);
  });
});

test('treats VERCEL_ENV preview as production', async () => {
  await withEnv({ NODE_ENV: undefined, VERCEL_ENV: 'preview' }, async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, 'production');
    assertEqual(mod.isProduction, true);
  });
});

test('recognizes CI alias as test environment', async () => {
  await withNodeEnv('ci', async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, 'test');
    assertEqual(mod.isTest, true);
  });
});
