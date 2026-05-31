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

Deno.test("telegram-webhook /plans falls back when dynamic pricing columns are missing", async () => {
  setTestEnv({
    TELEGRAM_WEBHOOK_SECRET: "s3cr3t",
    TELEGRAM_BOT_TOKEN: "token",
  });

  const selectedFields: string[] = [];
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

  const {
    __setCreateClientOverrideForTests,
    __resetCreateClientOverrideForTests,
  } = await import("../_shared/client.ts");
  __setCreateClientOverrideForTests(() => ({
    from(table: string) {
      assertEquals(table, "subscription_plans");
      return {
        select(fields: string) {
          selectedFields.push(fields);
          return {
            order() {
              if (fields.includes("dynamic_price_usdt")) {
                return Promise.resolve({
                  data: null,
                  error: {
                    code: "42703",
                    message:
                      "column subscription_plans.dynamic_price_usdt does not exist",
                  },
                });
              }

              return Promise.resolve({
                data: [{
                  id: "vip_bronze",
                  name: "VIP Bronze",
                  price: 49,
                  currency: "USD",
                }],
                error: null,
              });
            },
          };
        },
      };
    },
  } as never));

  try {
    const { default: handler } = await import(
      `../telegram-webhook/index.ts?plans=${crypto.randomUUID()}`
    );
    const req = new Request("https://example.com/telegram-webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "s3cr3t" },
      body: JSON.stringify({
        message: { chat: { id: 123 }, text: "/plans" },
      }),
    });

    const res = await handler(req);
    assertEquals(res.status, 200);
    assertEquals(selectedFields, [
      "id,name,price,currency,dynamic_price_usdt,last_priced_at,performance_snapshot",
      "id,name,price,currency",
    ]);
    assert(
      calls.some((call) =>
        call.input.includes("/sendMessage") &&
        call.body.includes("VIP Bronze") &&
        call.body.includes("$49.00")
      ),
    );
  } finally {
    __resetCreateClientOverrideForTests();
    clearTestEnv();
  }
});
