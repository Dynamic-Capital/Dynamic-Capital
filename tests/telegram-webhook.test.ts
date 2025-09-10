import test from 'node:test';
import { equal as assertEquals, ok as assert, deepEqual as assertDeepEqual, match as assertMatch } from 'node:assert/strict';
function setEnv() {
  process.env.TELEGRAM_BOT_TOKEN = 'token';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'secret';
  process.env.SUPABASE_URL = 'http://example.com';
}

function cleanupEnv() {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.SUPABASE_URL;
}

test('setup-telegram-webhook calls Telegram API', async () => {
  setEnv();
  const calls: { url: string; body?: string | null }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: Request | string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    calls.push({ url, body: init?.body ? String(init.body) : null });
    if (url.includes('deleteWebhook') || url.includes('setWebhook')) {
      return new Response(JSON.stringify({ ok: true, result: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const orig = 'supabase/functions/setup-telegram-webhook/index.ts';
    const patched = 'supabase/functions/setup-telegram-webhook/index.test.ts';
    const src = await Deno.readTextFile(orig);
    await Deno.writeTextFile(patched, src.replace('../_shared/telegram_secret.ts', '../../../tests/telegram-secret-stub.ts'));
    const { handler } = await import(`../${patched}?${Math.random()}`);
    const res = await handler(new Request('http://localhost', { method: 'POST' }));
    assertEquals(res.status, 200);
    const data = await res.json();
    assertDeepEqual(data, { success: true, webhook_set: true, webhook_url: 'http://example.com/functions/v1/telegram-bot' });
    assertEquals(calls.length, 2);
    const setCall = calls.find(c => c.url.includes('setWebhook'))!;
    const payload = JSON.parse(setCall.body!);
    assertEquals(payload.secret_token, 'secret');
    assertEquals(payload.url, 'http://example.com/functions/v1/telegram-bot');
  } finally {
    globalThis.fetch = originalFetch;
    await Deno.remove('supabase/functions/setup-telegram-webhook/index.test.ts').catch(() => {});
    cleanupEnv();
  }
});

test('telegram-webhook processes /ping and responds', async () => {
  setEnv();
  const calls: { url: string; body?: string | null }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: Request | string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    calls.push({ url, body: init?.body ? String(init.body) : null });
    if (url.startsWith('http://example.com/rest/v1/webhook_updates')) {
      return new Response(JSON.stringify([{ update_id: 1 }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.startsWith('https://api.telegram.org')) {
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const orig = 'supabase/functions/telegram-webhook/index.ts';
    const patched = 'supabase/functions/telegram-webhook/index.test.ts';
    let src = await Deno.readTextFile(orig);
    src = src.replace('../_shared/client.ts', '../../../tests/supabase-client-stub.ts');
    src = src.replace('../_shared/config.ts', '../../../tests/config-stub.ts');
    src = src.replace('../_shared/miniapp.ts', '../../../tests/miniapp-stub.ts');
    src = src.replace('../_shared/telegram_secret.ts', '../../../tests/telegram-secret-stub.ts');
    await Deno.writeTextFile(patched, src);
    const { default: handler } = await import(`../${patched}?${Math.random()}`);
    const req = new Request('http://localhost/telegram-webhook', {
      method: 'POST',
      headers: {
        'x-telegram-bot-api-secret-token': 'secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ update_id: 1, message: { text: '/ping', chat: { id: 42 } } }),
    });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertDeepEqual(data, { ok: true });
    const telegramCall = calls.find(c => c.url.includes('sendMessage'))!;
    const payload = JSON.parse(telegramCall.body!);
    assertEquals(payload.chat_id, 42);
    assertMatch(payload.text, /pong/);
  } finally {
    globalThis.fetch = originalFetch;
    await Deno.remove('supabase/functions/telegram-webhook/index.test.ts').catch(() => {});
    cleanupEnv();
  }
});

