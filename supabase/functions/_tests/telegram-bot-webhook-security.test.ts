import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("rejects requests without secret and preserves CORS", async () => {
  setTestEnv({
    TELEGRAM_WEBHOOK_SECRET: "s3cr3t",
    ALLOWED_ORIGINS: "*",
  });

  const req = new Request("https://example.com/telegram-bot", {
    method: "POST",
    body: "{}",
    headers: { origin: "https://example.com" },
  });

  const { validateTelegramHeader } = await import(
    "../_shared/telegram_secret.ts"
  );
  const res = await validateTelegramHeader(req);
  assertEquals(res?.status, 401);
  assertStrictEquals(res?.headers.get("access-control-allow-origin"), "*");

  clearTestEnv();
});

Deno.test("accepts valid secret", async () => {
  setTestEnv({
    TELEGRAM_WEBHOOK_SECRET: "s3cr3t",
    ALLOWED_ORIGINS: "*",
  });

  const req = new Request("https://example.com/telegram-bot", {
    method: "POST",
    headers: {
      "x-telegram-bot-api-secret-token": "s3cr3t",
      origin: "https://example.com",
    },
    body: JSON.stringify({}),
  });

  const { validateTelegramHeader } = await import(
    "../_shared/telegram_secret.ts"
  );
  const res = await validateTelegramHeader(req);
  assertStrictEquals(res, null);

  clearTestEnv();
});

Deno.test("skips validation for version endpoint", async () => {
  const req = new Request("https://example.com/version", { method: "GET" });
  const { validateTelegramHeader } = await import(
    "../_shared/telegram_secret.ts"
  );
  const res = await validateTelegramHeader(req);
  assertStrictEquals(res, null);
});
