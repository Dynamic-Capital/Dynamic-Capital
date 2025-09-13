import test from 'node:test';
import { rejects } from 'node:assert/strict';
import { freshImport } from './utils/freshImport.ts';

test('utils/config requires Supabase env vars', async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  await rejects(
    freshImport(new URL('../apps/web/utils/config.ts', import.meta.url)),
    /Missing required env: SUPABASE_URL/,
  );
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl; else delete process.env.SUPABASE_URL;
  if (prevKey !== undefined) process.env.SUPABASE_ANON_KEY = prevKey; else delete process.env.SUPABASE_ANON_KEY;
});

test('utils/config rejects null-like env values', async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = 'null';
  process.env.SUPABASE_ANON_KEY = 'undefined';
  await rejects(
    freshImport(new URL('../apps/web/utils/config.ts', import.meta.url)),
    /Missing required env: SUPABASE_URL/,
  );
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl; else delete process.env.SUPABASE_URL;
  if (prevKey !== undefined) process.env.SUPABASE_ANON_KEY = prevKey; else delete process.env.SUPABASE_ANON_KEY;
});
