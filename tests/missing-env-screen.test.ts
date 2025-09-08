import test from 'node:test';
import { ok as assert } from 'node:assert/strict';

test('missing Supabase env vars sets error flag', async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const mod = await import(`../src/config/supabase.ts?${Date.now()}`);
  assert(mod.SUPABASE_ENV_ERROR);
});
