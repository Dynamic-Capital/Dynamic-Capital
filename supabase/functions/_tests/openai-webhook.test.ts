import { assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

async function sign(body: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

Deno.test("openai-webhook rejects invalid signatures", async () => {
  setTestEnv({ OPENAI_WEBHOOK_SECRET: "testsecret" });
  const { default: handler } = await import("../openai-webhook/index.ts");
  const req = new Request("https://example.com/openai-webhook", {
    method: "POST",
    body: JSON.stringify({ type: "ping" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
  clearTestEnv();
});

Deno.test("openai-webhook accepts valid signatures", async () => {
  setTestEnv({ OPENAI_WEBHOOK_SECRET: "testsecret" });
  const body = JSON.stringify({ type: "ping" });
  const signature = await sign(body, "testsecret");
  const { default: handler } = await import("../openai-webhook/index.ts");
  const req = new Request("https://example.com/openai-webhook", {
    method: "POST",
    headers: { "OpenAI-Signature": signature },
    body,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  clearTestEnv();
});
