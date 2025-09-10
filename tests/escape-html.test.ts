import test from 'node:test';
import { equal as assertEquals } from 'node:assert/strict';

const supaState: any = { tables: {} };
(globalThis as any).__SUPA_MOCK__ = supaState;

function setEnv() {
  process.env.SUPABASE_URL = 'http://local';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.TELEGRAM_BOT_TOKEN = 'tok';
}

function cleanup() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.TELEGRAM_BOT_TOKEN;
  supaState.tables = {};
}

test('sendMessage escapes HTML characters', async () => {
  setEnv();
  const payloads: any[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input: Request | string, init?: RequestInit) => {
    payloads.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
  };
  try {
    const mod = await import(`../supabase/functions/telegram-bot/index.ts?${Math.random()}`);
    await mod.sendMessage(1, '<script>alert(1)</script>');
    assertEquals(payloads[0].text, '&lt;script&gt;alert(1)&lt;/script&gt;');
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
