import "./setup.ts";
import test from 'node:test';
import { equal as assertEquals } from 'node:assert/strict';

test('envOrSetting prefers env over bot_setting', async () => {
  process.env.SUPABASE_URL = 'https://example.com';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  const cfg = await import("../supabase/functions/_shared/config.ts");
  process.env.EXAMPLE_KEY = 'env-value';
  const original = cfg.getSetting;
  cfg.__setGetSetting((async () => 'db-value') as typeof cfg.getSetting);
  const val = await cfg.envOrSetting('EXAMPLE_KEY', 'EXAMPLE_KEY');
  assertEquals(val, 'env-value');
  cfg.__setGetSetting(original);
  delete process.env.EXAMPLE_KEY;
});
