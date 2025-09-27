import test from 'node:test';
import { equal as assertEquals } from 'node:assert/strict';
import type { SupabaseClient } from '../supabase/functions/_shared/client.ts';
import { freshImport } from './utils/freshImport.ts';

type LoadHandlerOptions = {
  matchFaq?: Array<{
    question: string;
    answer: string;
    distance: number;
  }>;
  onRpc?: (fn: string, params: Record<string, unknown>) => void | Promise<void>;
  onInsert?: (payload: Record<string, unknown>) => void | Promise<void>;
};

const createSupabaseStub = (options: LoadHandlerOptions): SupabaseClient => {
  const matchFaq = options.matchFaq ?? [];

  return {
    rpc: async (fn: string, params: Record<string, unknown>) => {
      await options.onRpc?.(fn, params);
      if (fn === 'match_faq') {
        return { data: matchFaq, error: null };
      }
      return { data: null, error: null };
    },
    from: () => ({
      insert: async (payload: Record<string, unknown>) => {
        await options.onInsert?.(payload);
        return { data: null, error: null };
      },
    }),
  } as unknown as SupabaseClient;
};

const loadHandler = async (options: LoadHandlerOptions = {}) => {
  Deno.env.set('OPENAI_API_KEY', 'test-key');
  Deno.env.set('GROK_API_KEY', 'grok-key');
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  Deno.env.set('SUPABASE_ANON_KEY', 'anon-key');

  const clientModule = await freshImport(
    new URL('../supabase/functions/_shared/client.ts', import.meta.url),
  ) as {
    __setCreateClientOverride?: (
      override: (
        role: 'anon' | 'service',
        options?: Record<string, unknown>,
      ) => SupabaseClient,
    ) => void;
  };

  const supabaseStub = createSupabaseStub(options);
  clientModule.__setCreateClientOverride?.((_role, _opts) => {
    return supabaseStub;
  });

  await freshImport(
    new URL('../apps/web/integrations/supabase/client.ts', import.meta.url),
  );
  const mod = await freshImport(
    new URL('../supabase/functions/ai-faq-assistant/index.ts', import.meta.url),
  );

  clientModule.__setCreateClientOverride?.(null);

  return mod.default as (req: Request) => Promise<Response>;
};

const createFetchStub = (overrides: {
  grok?: () => Promise<Response>;
  openai?: () => Promise<Response>;
  embeddings?: () => Promise<Response>;
  match?: (body: unknown) => Promise<Response>;
  insert?: (body: unknown) => Promise<Response>;
}) => {
  return async (input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    const bodyText = init?.body;
    const parseJson = async () => {
      if (typeof bodyText === 'string') return JSON.parse(bodyText);
      if (input instanceof Request) {
        const text = await input.clone().text();
        return text ? JSON.parse(text) : null;
      }
      return null;
    };

    if (url.includes('/rest/v1/rpc/match_faq')) {
      const body = await parseJson();
      return overrides.match?.(body) ?? Promise.resolve(new Response('[]', { status: 200 }));
    }

    if (url.includes('/rest/v1/faq_embeddings')) {
      const body = await parseJson();
      return overrides.insert?.(body) ?? Promise.resolve(new Response('{}', { status: 201 }));
    }

    if (url.includes('/v1/embeddings')) {
      return overrides.embeddings?.() ?? Promise.resolve(
        new Response(
          JSON.stringify({ data: [{ embedding: Array(5).fill(0.1) }] }),
          { status: 200 },
        ),
      );
    }

    if (url.includes('api.x.ai/v1/chat/completions')) {
      if (overrides.grok) return overrides.grok();
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'ޖަވާބު' } }] }),
        { status: 200 },
      );
    }

    if (url.includes('api.openai.com/v1/chat/completions')) {
      if (overrides.openai) return overrides.openai();
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'OpenAI answer' } }] }),
        { status: 200 },
      );
    }

    // Default stub for any Supabase fetch not covered above
    if (url.includes('test.supabase.co')) {
      return new Response('{}', { status: 200 });
    }

    throw new Error(`Unhandled fetch to ${method} ${url}`);
  };
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

test('routes dhivehi questions through Grok and stores language', async () => {
  const insertBodies: unknown[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createFetchStub({
    grok: async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'ދިވެހި ޖަވާބު' } }] }),
        { status: 200 },
      ),
  });

  try {
    const handler = await loadHandler({
      onRpc: (fn, params) => {
        if (fn === 'match_faq') {
          assertEquals(params.match_language, 'dv');
        }
      },
      onInsert: (payload) => insertBodies.push(payload),
    });
    const req = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ question: 'ޓްރޭޑިން އެންމެން ކޮށްލަން?', language: 'dv' }),
    });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.answer, 'ދިވެހި ޖަވާބު');
    assertEquals(body.language, 'dv');
    assertEquals(insertBodies.length, 1);
    assertEquals((insertBodies[0] as Record<string, unknown>).language, 'dv');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('falls back to OpenAI when Grok fails', async () => {
  const originalFetch = globalThis.fetch;
  let openAiCalls = 0;
  globalThis.fetch = createFetchStub({
    grok: async () => new Response(JSON.stringify({ error: 'failed' }), { status: 500 }),
    openai: async () => {
      openAiCalls += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'Fallback answer' } }] }),
        { status: 200 },
      );
    },
  });

  try {
    const handler = await loadHandler({
      onInsert: () => {},
    });
    const res = await handler(new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is risk management?', language: 'dv' }),
    }));
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.answer, 'Fallback answer');
    assertEquals(body.language, 'dv');
    assertEquals(openAiCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('english questions use OpenAI directly', async () => {
  const originalFetch = globalThis.fetch;
  let grokCalls = 0;
  let openAiCalls = 0;
  globalThis.fetch = createFetchStub({
    grok: async () => {
      grokCalls += 1;
      return new Response('{}', { status: 500 });
    },
    openai: async () => {
      openAiCalls += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'English answer' } }] }),
        { status: 200 },
      );
    },
  });

  try {
    const handler = await loadHandler({
      onInsert: () => {},
    });
    const res = await handler(new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ question: 'How do I start trading?', language: 'en' }),
    }));
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.answer, 'English answer');
    assertEquals(body.language, 'en');
    assertEquals(openAiCalls, 1);
    assertEquals(grokCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
