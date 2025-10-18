import {
  API_METRICS_OVERRIDE_SYMBOL,
  createNoopApiMetrics,
} from "@/observability/server-metrics.ts";

function assertCondition(
  condition: boolean,
  message: string,
): asserts condition {
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

const SESSION_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.session",
);

const AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.ai-chat.telemetry",
);

const { resetDynamicAiRateLimiters } = await import(
  "../../../../../services/rate-limit/dynamic-ai.ts"
);

interface SupabaseInsert {
  interaction_type: string;
  telegram_user_id: string;
  session_id: string;
  page_context: string;
  interaction_data: Record<string, unknown>;
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
  Deno.env.set("DYNAMIC_AI_CHAT_URL", "https://api.dynamiccapital.ton/chat");
  Deno.env.set("DYNAMIC_AI_CHAT_KEY", "dynamic-secret");
  Deno.env.set("DYNAMIC_AI_CHAT_USER_LIMIT", "5");
  Deno.env.set("DYNAMIC_AI_CHAT_USER_WINDOW_SECONDS", "60");
  Deno.env.set("DYNAMIC_AI_CHAT_SESSION_LIMIT", "10");
  Deno.env.set("DYNAMIC_AI_CHAT_SESSION_WINDOW_SECONDS", "300");
  resetDynamicAiRateLimiters();
}

Deno.test("POST /api/dynamic-ai/chat proxies requests to Dynamic AI", async () => {
  setEnv();
  const supabaseMock = createSupabaseMock();
  (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL] =
    supabaseMock;
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();
  (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
    async () => ({ user: { id: "session-user" } });

  const telemetryEvents: Record<string, unknown>[] = [];
  (globalThis as Record<PropertyKey, unknown>)[
    AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL
  ] = async (event: Record<string, unknown>) => {
    telemetryEvents.push(event);
  };

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
    language: "dv",
  } as const;

  try {
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

    assertCondition(payload.ok === true, "expected ok response");
    assertEquals(payload.assistantMessage?.content, "Desk is online");
    assertEquals(
      (payload.assistantMessage as { language?: string } | undefined)?.language,
      "dv",
    );
    assertCondition(
      payload.history?.length === 2,
      "expected history to include user and assistant",
    );

    const chatInserts = supabaseMock.inserts.filter((insert) =>
      insert.interaction_type === "ai_chat"
    );
    assertEquals(chatInserts.length, 2);
    const firstEntry = chatInserts[0]?.interaction_data as {
      content?: string;
      language?: string;
    };
    const secondEntry = chatInserts[1]?.interaction_data as {
      content?: string;
      language?: string;
    };
    assertEquals(firstEntry?.content, "Hello desk");
    assertEquals(firstEntry?.language, "dv");
    assertEquals(secondEntry?.content, "Desk is online");
    assertEquals(secondEntry?.language, "dv");

    assertEquals(fetchCalls.length, 1, "dynamic AI should be called once");
    const requestPayload = JSON.parse(
      String(fetchCalls[0]?.init?.body ?? "{}"),
    ) as Record<string, unknown>;
    assertEquals(requestPayload.language, "dv");

    const rateEvent = telemetryEvents.find((event) =>
      (event.event as string | undefined) === "rate_limit"
    );
    assertCondition(rateEvent !== undefined, "expected rate limit telemetry");
    assertEquals(rateEvent?.status, "allowed");
    const completionEvent = telemetryEvents.find((event) =>
      (event.event as string | undefined) === "completion"
    );
    assertCondition(
      completionEvent !== undefined,
      "expected completion telemetry",
    );
    assertEquals(completionEvent?.success, true);
  } finally {
    delete (globalThis as Record<PropertyKey, unknown>)[
      SUPABASE_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      DYNAMIC_AI_FETCH_OVERRIDE
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      API_METRICS_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      SESSION_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL
    ];
  }
});

async function collectSseEvents(response: Response) {
  const body = response.body;
  assertCondition(body !== null, "expected response body stream");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Record<string, unknown>[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = raw
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) {
        events.push(JSON.parse(data));
      }
      boundary = buffer.indexOf("\n\n");
    }
  }

  return events;
}

Deno.test("POST /api/dynamic-ai/chat streams realtime updates", async () => {
  setEnv();
  const supabaseMock = createSupabaseMock();
  (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL] =
    supabaseMock;
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();
  (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
    async () => ({ user: { id: "session-user" } });

  const telemetryEvents: Record<string, unknown>[] = [];
  (globalThis as Record<PropertyKey, unknown>)[
    AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL
  ] = async (event: Record<string, unknown>) => {
    telemetryEvents.push(event);
  };

  (globalThis as Record<PropertyKey, unknown>)[DYNAMIC_AI_FETCH_OVERRIDE] =
    async () =>
      new Response(
        JSON.stringify({ answer: "Desk is online", metadata: { latency: 42 } }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );

  const { POST } = await import("../route.ts");

  const body = {
    sessionId: "session-stream",
    message: "Hello desk",
    history: [],
  } as const;

  try {
    const response = await POST(
      new Request("http://localhost/api/dynamic-ai/chat?stream=1", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
    );

    assertEquals(response.status, 200);
    const contentType = response.headers.get("content-type") ?? "";
    assertCondition(
      contentType.includes("text/event-stream"),
      "expected SSE content type",
    );

    const events = await collectSseEvents(response);
    assertCondition(events.length >= 2, "expected multiple SSE events");
    assertEquals(events[0]?.type, "ack");

    const tokenEvents = events.filter((event) => event.type === "token");
    const doneEvent = events.find((event) => event.type === "done");
    assertCondition(tokenEvents.length > 0, "expected token events");
    const finalContent = tokenEvents[tokenEvents.length - 1]?.content;
    assertEquals(finalContent, "Desk is online");
    assertCondition(doneEvent !== undefined, "expected done event");
    assertEquals(Array.isArray(doneEvent?.history), true, "done history array");
    assertCondition(
      (doneEvent?.history as unknown[] | undefined)?.length === 2,
      "expected streamed history",
    );

    const chatInserts = supabaseMock.inserts.filter((insert) =>
      insert.interaction_type === "ai_chat"
    );
    assertEquals(chatInserts.length, 2);
    const assistantInsert = chatInserts[1]?.interaction_data as {
      content?: string;
    };
    assertEquals(assistantInsert?.content, "Desk is online");

    const completionEvent = telemetryEvents.find((event) =>
      (event.event as string | undefined) === "completion"
    );
    assertCondition(
      completionEvent !== undefined,
      "expected completion telemetry",
    );
    assertEquals(completionEvent?.success, true);
    assertEquals(completionEvent?.streamed, true);
  } finally {
    delete (globalThis as Record<PropertyKey, unknown>)[
      SUPABASE_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      DYNAMIC_AI_FETCH_OVERRIDE
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      API_METRICS_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      SESSION_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL
    ];
  }
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
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();
  (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
    async () => ({ user: { id: "session-user" } });

  const { GET } = await import("../route.ts");

  const response = await GET(
    new Request("http://localhost/api/dynamic-ai/chat?sessionId=session-abc"),
  );

  assertEquals(response.status, 200);
  const payload = await response.json() as {
    ok?: boolean;
    messages?: Array<{ role: string; content: string }>;
  };

  assertCondition(payload.ok === true, "expected ok response");
  assertEquals(payload.messages?.length, 2);
  assertEquals(payload.messages?.[0]?.role, "assistant");
  assertEquals(payload.messages?.[1]?.content, "Tell me more");

  delete (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL];
  delete (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AI_FETCH_OVERRIDE
  ];
  delete (globalThis as Record<PropertyKey, unknown>)[
    API_METRICS_OVERRIDE_SYMBOL
  ];
  delete (globalThis as Record<PropertyKey, unknown>)[
    SESSION_OVERRIDE_SYMBOL
  ];
});

Deno.test(
  "POST /api/dynamic-ai/chat rejects unauthenticated requests",
  async () => {
    setEnv();
    (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
      createNoopApiMetrics();
    (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
      async () => null;

    const { POST } = await import("../route.ts");

    const response = await POST(
      new Request("http://localhost/api/dynamic-ai/chat", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "unauth",
          message: "Hi",
          history: [],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    assertEquals(response.status, 401);
    const payload = await response.json() as { ok?: boolean; error?: string };
    assertCondition(payload.ok === false, "expected failure response");
    assertEquals(payload.error, "Authentication required.");

    delete (globalThis as Record<PropertyKey, unknown>)[
      API_METRICS_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      SESSION_OVERRIDE_SYMBOL
    ];
  },
);

Deno.test("POST /api/dynamic-ai/chat enforces rate limits", async () => {
  setEnv();
  Deno.env.set("DYNAMIC_AI_CHAT_USER_LIMIT", "1");
  Deno.env.set("DYNAMIC_AI_CHAT_SESSION_LIMIT", "1");
  resetDynamicAiRateLimiters();

  const supabaseMock = createSupabaseMock();
  (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL] =
    supabaseMock;
  (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
    createNoopApiMetrics();
  (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
    async () => ({ user: { id: "rate-user" } });

  const telemetryEvents: Record<string, unknown>[] = [];
  (globalThis as Record<PropertyKey, unknown>)[
    AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL
  ] = async (event: Record<string, unknown>) => {
    telemetryEvents.push(event);
  };

  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> =
    [];
  (globalThis as Record<PropertyKey, unknown>)[DYNAMIC_AI_FETCH_OVERRIDE] =
    async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      return new Response(
        JSON.stringify({ answer: "OK", metadata: {} }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

  const { POST } = await import("../route.ts");

  const request = () =>
    new Request("http://localhost/api/dynamic-ai/chat", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "limited-session",
        message: "Ping",
        history: [],
      }),
      headers: { "content-type": "application/json" },
    });

  try {
    const first = await POST(request());
    assertEquals(first.status, 200);
    await first.json();

    const second = await POST(request());
    assertEquals(second.status, 429);
    const payload = await second.json() as {
      ok?: boolean;
      error?: string;
      limits?: Array<{ blocked?: boolean }>;
    };

    assertCondition(payload.ok === false, "expected rate limit failure");
    assertEquals(
      payload.error,
      "Rate limit exceeded. Please try again later.",
    );
    assertCondition(Array.isArray(payload.limits), "expected limits array");
    assertCondition(
      payload.limits?.some((entry) => entry.blocked === true) ?? false,
      "expected blocked limiter",
    );

    assertEquals(fetchCalls.length, 1, "second call should not reach backend");

    const chatInserts = supabaseMock.inserts.filter((insert) =>
      insert.interaction_type === "ai_chat"
    );
    assertEquals(chatInserts.length, 2);

    const blockedEvent = telemetryEvents.find((event) =>
      (event.event as string | undefined) === "rate_limit" &&
      event.status === "blocked"
    );
    assertCondition(blockedEvent !== undefined, "expected blocked telemetry");
  } finally {
    delete (globalThis as Record<PropertyKey, unknown>)[
      SUPABASE_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      DYNAMIC_AI_FETCH_OVERRIDE
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      API_METRICS_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      SESSION_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL
    ];
  }
});

Deno.test(
  "POST /api/dynamic-ai/chat rejects whitespace-only inputs",
  async () => {
    setEnv();
    const supabaseMock = createSupabaseMock();
    (globalThis as Record<PropertyKey, unknown>)[SUPABASE_OVERRIDE_SYMBOL] =
      supabaseMock;
    (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
      createNoopApiMetrics();
    (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
      async () => ({ user: { id: "session-user" } });

    const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> =
      [];
    (globalThis as Record<PropertyKey, unknown>)[DYNAMIC_AI_FETCH_OVERRIDE] =
      async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };

    const { POST } = await import("../route.ts");

    const response = await POST(
      new Request("http://localhost/api/dynamic-ai/chat", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "   ",
          message: "    ",
          history: [],
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    assertEquals(response.status, 400);
    const payload = await response.json() as { ok?: boolean; error?: string };
    assertCondition(payload.ok === false, "expected failure response");
    assertEquals(payload.error, "sessionId and message are required");
    assertEquals(supabaseMock.inserts.length, 0);
    assertEquals(fetchCalls.length, 0);

    delete (globalThis as Record<PropertyKey, unknown>)[
      SUPABASE_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      DYNAMIC_AI_FETCH_OVERRIDE
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      API_METRICS_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      SESSION_OVERRIDE_SYMBOL
    ];
  },
);
