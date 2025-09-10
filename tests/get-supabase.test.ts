import test from 'node:test';
import { throws } from 'node:assert/strict';

const supaState: any = { tables: {} };
(globalThis as any).__SUPA_MOCK__ = supaState;

function setEnv() {
  process.env.SUPABASE_URL = 'http://local';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.TELEGRAM_BOT_TOKEN = 'tok';
  // Intentionally omit SUPABASE_SERVICE_ROLE_KEY
}

function cleanup() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.TELEGRAM_BOT_TOKEN;
  supaState.tables = {};
}

test('getSupabase throws when credentials missing', async () => {
  setEnv();
  const mod = await import(`../supabase/functions/telegram-bot/index.ts?${Math.random()}`);
  throws(() => mod.getSupabase(), /Missing Supabase credentials/);
  cleanup();
});
