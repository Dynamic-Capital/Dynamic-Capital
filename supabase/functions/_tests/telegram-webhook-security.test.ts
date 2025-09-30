import { assertEquals } from "std/testing/asserts.ts";
import { setTestEnv, clearTestEnv } from "./env-mock.ts";

Deno.test("telegram-webhook rejects requests without secret", async () => {
  setTestEnv({ TELEGRAM_WEBHOOK_SECRET: "s3cr3t" });
  const { default: handler } = await import("../telegram-webhook/index.ts");
  const req = new Request("https://example.com/telegram-webhook", {
    method: "POST",
    body: "{}",
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
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
