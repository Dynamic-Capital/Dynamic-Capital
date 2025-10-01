import test from "node:test";
import { equal as assertEquals, ok as assertOk } from "node:assert/strict";

import { freshImport } from "./utils/freshImport.ts";

const loadHandler = async () => {
  Deno.env.set("OPENAI_API_KEY", "test-key");
  const originalServe = Deno.serve;
  Deno.serve = ((opts: unknown, maybeHandler?: unknown) => {
    if (typeof opts === "function") {
      return undefined as unknown as ReturnType<typeof originalServe>;
    }
    if (typeof maybeHandler === "function") {
      return undefined as unknown as ReturnType<typeof originalServe>;
    }
    return undefined as unknown as ReturnType<typeof originalServe>;
  }) as typeof Deno.serve;

  try {
    const mod = await freshImport(
      new URL("../supabase/functions/chatgpt-proxy/index.ts", import.meta.url),
    );
    return mod.default as (req: Request) => Promise<Response>;
  } finally {
    Deno.serve = originalServe;
  }
};

test("chatgpt-proxy responds to test ping", async () => {
  const handler = await loadHandler();
  const req = new Request("https://example.com", {
    method: "POST",
    body: JSON.stringify({ test: true }),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
});

test("chatgpt-proxy rejects missing user message", async () => {
  const handler = await loadHandler();
  const req = new Request("https://example.com", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "assistant", content: "hi" }] }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

test("chatgpt-proxy forwards chat history to OpenAI", async () => {
  const handler = await loadHandler();
  const originalFetch = globalThis.fetch;
  const recorded: { url: string | URL; init: RequestInit | undefined }[] = [];

  globalThis.fetch = async (
    input: Request | URL | string,
    init?: RequestInit,
  ) => {
    recorded.push({ url: input, init });
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "Desk reply" } }] }),
      { status: 200 },
    );
  };

  try {
    const res = await handler(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "system", content: "context" },
            { role: "assistant", content: "Earlier answer" },
            { role: "user", content: "What is next?" },
          ],
        }),
      }),
    );

    assertEquals(res.status, 200);
    assertEquals(recorded.length, 1);
    const body = recorded[0].init?.body;
    assertOk(typeof body === "string");
    const parsed = JSON.parse(body);
    assertEquals(typeof parsed.temperature, "number");
    assertEquals(parsed.messages.at(-1)?.content, "What is next?");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
