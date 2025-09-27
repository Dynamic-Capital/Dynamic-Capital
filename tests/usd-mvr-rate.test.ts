import test from 'node:test';
import { equal as assertEquals } from 'node:assert/strict';
import { freshImport } from './utils/freshImport.ts';

const resetEnv = (key: string, value: string | undefined) => {
  if (value === undefined) {
    try {
      Deno.env.delete(key);
    } catch {
      // ignore
    }
    return;
  }
  Deno.env.set(key, value);
};

test('getUsdToMvrRate honours env override', async () => {
  const previous = Deno.env.get('USD_MVR_RATE');
  Deno.env.set('USD_MVR_RATE', '21.4');
  try {
    const mod = await freshImport(new URL('../supabase/functions/_shared/config.ts', import.meta.url));
    const rate = await mod.getUsdToMvrRate();
    assertEquals(rate, 21.4);
  } finally {
    resetEnv('USD_MVR_RATE', previous);
  }
});

test('getUsdToMvrRate reads bot content when env missing', async () => {
  const previous = Deno.env.get('USD_MVR_RATE');
  resetEnv('USD_MVR_RATE', undefined);
  const mod = await freshImport(new URL('../supabase/functions/_shared/config.ts', import.meta.url));
  mod.__setGetContent(async (key: string) => key === 'usd_mvr_rate' ? '19.75' : null);
  try {
    const rate = await mod.getUsdToMvrRate();
    assertEquals(rate, 19.75);
  } finally {
    resetEnv('USD_MVR_RATE', previous);
  }
});

test('getUsdToMvrRate falls back to default when invalid', async () => {
  const previous = Deno.env.get('USD_MVR_RATE');
  resetEnv('USD_MVR_RATE', undefined);
  const mod = await freshImport(new URL('../supabase/functions/_shared/config.ts', import.meta.url));
  mod.__setGetContent(async () => 'not-a-number');
  try {
    const rate = await mod.getUsdToMvrRate();
    assertEquals(rate, 20);
  } finally {
    resetEnv('USD_MVR_RATE', previous);
  }
});

test('convertUsdAmount applies rate for MVR and leaves USD untouched', async () => {
  const mod = await freshImport(new URL('../supabase/functions/_shared/config.ts', import.meta.url));
  assertEquals(mod.convertUsdAmount(100, 'USD', 25), 100);
  assertEquals(mod.convertUsdAmount(100, 'MVR', 20), 2000);
  assertEquals(mod.convertUsdAmount(100, 'MVR', -5), 2000);
});
