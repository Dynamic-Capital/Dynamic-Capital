function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected} but received ${actual}`);
  }
}

declare const Deno: {
  env: { set(key: string, value: string): void };
  test: (name: string, fn: () => void | Promise<void>) => void;
};

const DYNAMIC_AI_FETCH_OVERRIDE = Symbol.for(
  "dynamic-capital.dynamic-ai.fetch-override",
);

const SUPABASE_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.supabase",
);

interface SupabaseInsert {
  interaction_type: string;
  telegram_user_id: string;
  session_id: string;
  page_context: string;
  interaction_data: { role: string; content: string };
}

function createSupabaseMock() {
  const inserts: SupabaseInsert[] = [];
  let historyRows: Array<{ interaction_data: unknown }> = [];

  return {
    inserts,
    setHistory(rows: Array<{ interaction_data: unknown }>) {
      historyRows = rows;
    },
    from(table: string) {
      assertEquals(table, "user_interactions", "Unexpected table");
      return {
        insert: async (payload: SupabaseInsert) => {
          inserts.push(payload);
          return { error: null };
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: historyRows, error: null }),
              }),
            }),
          }),
        }),
      };
    },
  };
}

function setEnv() {
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  Deno.env.set("DYNAMIC_AI_CHAT_URL", "https://dynamic.ai/chat");
  Deno.env.set("DYNAMIC_AI_CHAT_KEY", "dynamic-secret");
}

Deno.test("POST /api/dynamic-ai/chat proxies requests to Dynamic AI", async () => {
  setEnv();
  const supabaseMock = createSupabaseMock();
  (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL] =
    supabaseMock;

  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> =
    [];
  (globalThis as Record<PropertyKey, unknown>)[DYNAMIC_AI_FETCH_OVERRIDE] =
    async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      return new Response(
        JSON.stringify({ answer: "Desk is online", metadata: { latency: 42 } }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

  const { POST } = await import("../route.ts");

  const body = {
    sessionId: "session-123",
    message: "Hello desk",
    history: [],
    telegram: { id: "1001", username: "vip" },
  } as const;

  const response = await POST(
    new Request("http://localhost/api/dynamic-ai/chat", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );

  assertEquals(response.status, 200);
  const payload = await response.json() as {
    ok?: boolean;
    assistantMessage?: { role: string; content: string };
    history?: Array<{ role: string; content: string }>;
    metadata?: Record<string, unknown>;
  };

  assert(payload.ok === true, "expected ok response");
  assertEquals(payload.assistantMessage?.content, "Desk is online");
  assert(
    payload.history?.length === 2,
    "expected history to include user and assistant",
  );
  assertEquals(supabaseMock.inserts.length, 2);
  assertEquals(supabaseMock.inserts[0]?.interaction_data.content, "Hello desk");
  assertEquals(
    supabaseMock.inserts[1]?.interaction_data.content,
    "Desk is online",
  );
  assertEquals(fetchCalls.length, 1, "dynamic AI should be called once");

  delete (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL];
  delete (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AI_FETCH_OVERRIDE
  ];
});

Deno.test("GET /api/dynamic-ai/chat returns persisted history", async () => {
  setEnv();
  const supabaseMock = createSupabaseMock();
  supabaseMock.setHistory([
    { interaction_data: { role: "assistant", content: "Welcome" } },
    { interaction_data: { role: "user", content: "Tell me more" } },
  ]);
  (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL] =
    supabaseMock;

  const { GET } = await import("../route.ts");

  const response = await GET(
    new Request("http://localhost/api/dynamic-ai/chat?sessionId=session-abc"),
  );

  assertEquals(response.status, 200);
  const payload = await response.json() as {
    ok?: boolean;
    messages?: Array<{ role: string; content: string }>;
  };

  assert(payload.ok === true, "expected ok response");
  assertEquals(payload.messages?.length, 2);
  assertEquals(payload.messages?.[0]?.role, "assistant");
  assertEquals(payload.messages?.[1]?.content, "Tell me more");

  delete (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL];
  delete (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AI_FETCH_OVERRIDE
  ];
});
