import {
  API_METRICS_OVERRIDE_SYMBOL,
  createNoopApiMetrics,
} from "@/observability/server-metrics.ts";

declare const Deno: {
  env: { set(key: string, value: string): void };
  test: (name: string, fn: () => void | Promise<void>) => void;
};

function assertCondition(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected} but received ${actual}`);
  }
}

const DYNAMIC_AI_FETCH_OVERRIDE = Symbol.for(
  "dynamic-capital.dynamic-ai.fetch-override",
);

const SESSION_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.session",
);

function setVoiceEnv() {
  Deno.env.set("DYNAMIC_AI_VOICE_TO_TEXT_URL", "https://dynamic.ai/transcribe");
  Deno.env.set("DYNAMIC_AI_VOICE_TO_TEXT_KEY", "voice-secret");
  Deno.env.set("DYNAMIC_AI_VOICE_TO_TEXT_MODEL", "gpt-4o-mini-transcribe");
  Deno.env.set("ADMIN_API_SECRET", "admin-secret");
}

Deno.test(
  "POST /api/dynamic-ai/voice-to-text transcribes audio",
  async () => {
    setVoiceEnv();
    (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
      createNoopApiMetrics();
    (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
      async () => ({ user: { id: "voice-user" } });

    const fetchCalls: Array<{ init?: RequestInit }> = [];
    (globalThis as Record<PropertyKey, unknown>)[DYNAMIC_AI_FETCH_OVERRIDE] =
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ init });
        return new Response(
          JSON.stringify({
            text: "Hello world",
            language: "dv",
            duration_ms: 1234,
            segments: [
              { text: "Hello", start: 0, end: 1.2, confidence: 0.92 },
              { text: "world", start: 1.2, end: 2.4, confidence: 0.88 },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      };

    const { POST } = await import("../route.ts");

    const formData = new FormData();
    formData.append(
      "file",
      new File(["dummy"], "clip.ogg", { type: "audio/ogg" }),
    );
    formData.append("prompt", "spell names correctly");
    formData.append("temperature", "0.2");
    formData.append("language", "Dhivehi");

    const response = await POST(
      new Request("http://localhost/api/dynamic-ai/voice-to-text", {
        method: "POST",
        body: formData,
      }),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as {
      ok?: boolean;
      transcript?: string;
      language?: string | null;
      segments?: unknown;
      durationMs?: number | null;
      metadata?: { model?: string; temperature?: number };
    };

    assertCondition(payload.ok === true, "expected ok response");
    assertEquals(payload.transcript, "Hello world");
    assertEquals(payload.language, "dv");
    assertCondition(
      Array.isArray(payload.segments),
      "segments should be array",
    );
    assertEquals(payload.durationMs, 1234);
    assertEquals(payload.metadata?.model, "gpt-4o-mini-transcribe");
    assertEquals(payload.metadata?.temperature, 0.2);

    assertEquals(fetchCalls.length, 1);
    const body = fetchCalls[0]?.init?.body;
    assertCondition(body instanceof FormData, "fetch body should be FormData");
    const modelEntry = body?.get("model");
    assertEquals(modelEntry, "gpt-4o-mini-transcribe");
    const promptEntry = body?.get("prompt");
    assertEquals(promptEntry, "spell names correctly");
    const languageEntry = body?.get("language");
    assertEquals(languageEntry, "dv");

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

Deno.test(
  "POST /api/dynamic-ai/voice-to-text rejects missing audio",
  async () => {
    setVoiceEnv();
    (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
      createNoopApiMetrics();
    (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
      async () => ({ user: { id: "voice-user" } });

    const { POST } = await import("../route.ts");

    const formData = new FormData();
    formData.append("prompt", "missing audio");

    const response = await POST(
      new Request("http://localhost/api/dynamic-ai/voice-to-text", {
        method: "POST",
        body: formData,
      }),
    );

    assertEquals(response.status, 400);

    delete (globalThis as Record<PropertyKey, unknown>)[
      API_METRICS_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      SESSION_OVERRIDE_SYMBOL
    ];
  },
);

Deno.test(
  "POST /api/dynamic-ai/voice-to-text requires authentication",
  async () => {
    setVoiceEnv();
    (globalThis as Record<PropertyKey, unknown>)[API_METRICS_OVERRIDE_SYMBOL] =
      createNoopApiMetrics();
    (globalThis as Record<PropertyKey, unknown>)[SESSION_OVERRIDE_SYMBOL] =
      async () => null;

    const { POST } = await import("../route.ts");

    const formData = new FormData();
    formData.append(
      "file",
      new File(["dummy"], "clip.ogg", { type: "audio/ogg" }),
    );

    const response = await POST(
      new Request("http://localhost/api/dynamic-ai/voice-to-text", {
        method: "POST",
        body: formData,
      }),
    );

    assertEquals(response.status, 401);

    delete (globalThis as Record<PropertyKey, unknown>)[
      API_METRICS_OVERRIDE_SYMBOL
    ];
    delete (globalThis as Record<PropertyKey, unknown>)[
      SESSION_OVERRIDE_SYMBOL
    ];
  },
);
