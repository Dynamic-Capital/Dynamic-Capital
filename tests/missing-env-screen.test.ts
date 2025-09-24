import test from 'node:test';
import { strictEqual } from 'node:assert/strict';
import { freshImport } from './utils/freshImport.ts';

test('supabase config falls back to baked-in defaults', async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const mod = await freshImport(new URL('../apps/web/config/supabase.ts', import.meta.url));
  strictEqual(mod.SUPABASE_ENV_ERROR, '');
  strictEqual(mod.SUPABASE_CONFIG.URL, 'https://qeejuomcapbdlhnjqjcc.supabase.co');
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
  if (prevKey !== undefined) process.env.SUPABASE_ANON_KEY = prevKey;
});
