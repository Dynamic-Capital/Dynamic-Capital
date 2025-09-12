import test from 'node:test';
import { equal as assertEquals } from 'node:assert/strict';

const loadHandler = async () => {
  Deno.env.set('OPENAI_API_KEY', 'test-key');
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  Deno.env.set('SUPABASE_ANON_KEY', 'anon-key');
  await import(`../apps/web/integrations/supabase/client.ts?test=${Math.random()}`);
  const mod = await import(`../supabase/functions/ai-faq-assistant/index.ts?test=${Math.random()}`);
  return mod.default as (req: Request) => Promise<Response>;
};

test('ai-faq-assistant responds to test ping', async () => {
  const handler = await loadHandler();
  const req = new Request('https://example.com', {
    method: 'POST',
    body: JSON.stringify({ test: true }),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
});

test('ai-faq-assistant validates question', async () => {
  const handler = await loadHandler();
  const req = new Request('https://example.com', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});
