import test from 'node:test';
import { equal as assertEquals, ok as assert, match as assertMatch, deepEqual as assertDeepEqual } from 'node:assert/strict';
import { freshImport } from './utils/freshImport.ts';

function setEnv() {
  process.env.SUPABASE_URL = 'http://example.com';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
}

function cleanupEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

test('receipt-upload-url returns signed URL', async () => {
  setEnv();
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: Request | string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    calls.push(url);
    if (url.includes('/storage/v1/object/upload/sign/')) {
      return new Response(JSON.stringify({ url: '/storage/v1/object/upload/sign/payment-receipts/test?token=token' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  let patched: URL | undefined;
  try {
    const orig = new URL('../supabase/functions/receipt-upload-url/index.ts', import.meta.url);
    patched = new URL('../supabase/functions/receipt-upload-url/index.test.ts', import.meta.url);
    const src = await Deno.readTextFile(orig);
    await Deno.writeTextFile(
      patched,
      src
        .replace('../_shared/client.ts', '../../../tests/supabase-client-stub.ts')
        .replace('../_shared/serve.ts', '../../../tests/serve-stub.ts'),
    );
    const { handler } = await freshImport(patched);
    const body = { payment_id: 'p1', telegram_id: '123', filename: 'r.png' };
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.bucket, 'payment-receipts');
    assertMatch(data.file_path, /^receipts\/123\//);
    assertMatch(data.upload_url, /token=token$/);
    // No actual network calls due to stubbed client
  } finally {
    globalThis.fetch = originalFetch;
    if (patched) await Deno.remove(patched).catch(() => {});
    cleanupEnv();
  }
});

test('receipt-submit updates payment and subscription', async () => {
  setEnv();
  const calls: { url: string; method: string }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: Request | string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const method = init?.method || 'GET';
    calls.push({ url, method });
    if (url.includes('/rest/v1/payments')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/rest/v1/user_subscriptions')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  let handler: (req: Request) => Promise<Response> | Response;
  let patched: URL | undefined;
  try {
    const orig = new URL('../supabase/functions/receipt-submit/index.ts', import.meta.url);
    patched = new URL('../supabase/functions/receipt-submit/index.test.ts', import.meta.url);
    let src = await Deno.readTextFile(orig);
    src = src.replace('../_shared/client.ts', '../../../tests/supabase-client-stub.ts');
    src = src.replace('../_shared/serve.ts', '../../../tests/serve-stub.ts');
    await Deno.writeTextFile(patched, src);
    const mod = await freshImport(patched);
    handler = mod.handler;
    assert(typeof handler === 'function');
    const body = { payment_id: 'p1', file_path: 'receipts/123/file.png', telegram_id: '123' };
    const req = new Request('http://localhost/receipt-submit', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
    const res = await handler!(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.success, true);
    assertEquals(data.payment_id, 'p1');
    // Database update stubs executed without network calls
  } finally {
    globalThis.fetch = originalFetch;
    if (patched) await Deno.remove(patched).catch(() => {});
    cleanupEnv();
  }
});

