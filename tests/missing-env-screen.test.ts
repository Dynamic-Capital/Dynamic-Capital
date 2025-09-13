import test from 'node:test';
import { ok as assert } from 'node:assert/strict';
import { freshImport } from './utils/freshImport.ts';

test('missing Supabase env vars sets error flag', async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const mod = await freshImport(new URL('../apps/web/config/supabase.ts', import.meta.url));
  assert(mod.SUPABASE_ENV_ERROR);
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
  if (prevKey !== undefined) process.env.SUPABASE_ANON_KEY = prevKey;
});
