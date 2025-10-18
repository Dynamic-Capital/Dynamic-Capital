import { createHmac } from "node:crypto";
import { Buffer } from "node:buffer";

const EXECUTE_CHAT_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.multi-llm.execute-chat",
);

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

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected} but received ${actual}`);
  }
}

function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;

  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createAdminToken(secret: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: "admin-user",
      admin: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signingInput}.${signature}`;
}

Deno.test("POST /api/tools/multi-llm/chat rejects unauthenticated calls", async () => {
  const { POST } = await import("../route.ts");

  const response = await POST(
    new Request("http://localhost/api/tools/multi-llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId: "openai",
        messages: [{ role: "user", content: "Hello" }],
      }),
    }),
  );

  assertEquals(response.status, 401);
  const payload = await response.json() as { ok?: boolean; error?: string };
  assertCondition(payload.ok === false, "expected authentication failure");
});

Deno.test("POST /api/tools/multi-llm/chat allows verified admin", async () => {
  const secret = "test-admin-secret";
  Deno.env.set("ADMIN_API_SECRET", secret);

  const calls: unknown[] = [];
  const mockResult = {
    provider: {
      id: "openai",
      name: "OpenAI",
      description: "Mock",
      configured: true,
      defaultModel: "gpt",
      contextWindow: 10,
      maxOutputTokens: 5,
    },
    message: { role: "assistant", content: "Hello admin" },
    usage: { inputTokens: 10, outputTokens: 5 },
  } as const;

  (globalThis as Record<PropertyKey, unknown>)[EXECUTE_CHAT_OVERRIDE_SYMBOL] =
    async (payload: unknown) => {
      calls.push(payload);
      return mockResult;
    };

  const { POST } = await import("../route.ts");

  const response = await POST(
    new Request("http://localhost/api/tools/multi-llm/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${createAdminToken(secret)}`,
      },
      body: JSON.stringify({
        providerId: "openai",
        messages: [{ role: "user", content: "Ping" }],
      }),
    }),
  );

  assertEquals(response.status, 200);
  const payload = await response.json() as typeof mockResult;
  assertEquals(payload.message.content, "Hello admin");
  assertEquals(calls.length, 1, "expected executeChat to be invoked");

  delete (globalThis as Record<PropertyKey, unknown>)[
    EXECUTE_CHAT_OVERRIDE_SYMBOL
  ];
});
