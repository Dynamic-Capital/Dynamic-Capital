(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/testing/asserts.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("telegram-webhook normalizes bot-mentioned commands", async () => {
  const { normalizeTelegramCommand } = await import(
    `../telegram-webhook/index.ts?normalize=${crypto.randomUUID()}`
  );

  assertEquals(
    normalizeTelegramCommand("/start@DynamicCapitalBot foo"),
    "/start",
  );
  assertEquals(
    normalizeTelegramCommand("  /PLANS@DynamicCapitalBot"),
    "/plans",
  );
  assertEquals(normalizeTelegramCommand("hello"), null);
});

Deno.test("telegram-webhook ignores requests without secret", async () => {
  setTestEnv({ TELEGRAM_WEBHOOK_SECRET: "s3cr3t" });
  const { default: handler } = await import("../telegram-webhook/index.ts");
  const req = new Request("https://example.com/telegram-webhook", {
    method: "POST",
    body: "{}",
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const payload = await res.json();
  assertEquals(payload.ignored, true);
  assertEquals(payload.detail, "missing");
  clearTestEnv();
});

Deno.test("telegram-webhook accepts valid secret", async () => {
  setTestEnv({ TELEGRAM_WEBHOOK_SECRET: "s3cr3t" });
  const { default: handler } = await import("../telegram-webhook/index.ts");
  const req = new Request("https://example.com/telegram-webhook", {
    method: "POST",
    headers: { "x-telegram-bot-api-secret-token": "s3cr3t" },
    body: JSON.stringify({ update_id: 1 }),
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  clearTestEnv();
});

Deno.test("telegram-webhook responds to /start with bot mention", async () => {
  setTestEnv({
    TELEGRAM_WEBHOOK_SECRET: "s3cr3t",
    TELEGRAM_BOT_TOKEN: "token",
    MINI_APP_URL: "https://mini.example.com/",
  });

  const calls: { input: string; body: string }[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string"
      ? init.body
      : init?.body
      ? JSON.stringify(init.body)
      : "";
    calls.push({ input: String(input), body });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  };

  const { default: handler } = await import(
    `../telegram-webhook/index.ts?start=${crypto.randomUUID()}`
  );
  const req = new Request("https://example.com/telegram-webhook", {
    method: "POST",
    headers: { "x-telegram-bot-api-secret-token": "s3cr3t" },
    body: JSON.stringify({
      message: { chat: { id: 123 }, text: "/start@DynamicCapitalBot" },
    }),
  });

  const res = await handler(req);
  assertEquals(res.status, 200);
  assert(
    calls.some((call) =>
      call.input.includes("/sendMessage") &&
      call.body.includes('"chat_id":123')
    ),
  );

  clearTestEnv();
});
