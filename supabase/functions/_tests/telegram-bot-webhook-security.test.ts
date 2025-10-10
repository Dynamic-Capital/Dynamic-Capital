import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { __setGetSetting, getSetting } from "../_shared/config.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("ignores requests without secret and preserves CORS", async () => {
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
  assertEquals(res?.status, 200);
  const payload = res ? await res.json() : null;
  assertEquals(payload?.ignored, true);
  assertEquals(payload?.detail, "missing");
  assertStrictEquals(res?.headers.get("access-control-allow-origin"), "*");

  clearTestEnv();
});

Deno.test("allows requests when secret is not configured", async () => {
  clearTestEnv();

  const req = new Request("https://example.com/telegram-bot", {
    method: "POST",
    body: "{}",
  });

  const { validateTelegramHeader } = await import(
    "../_shared/telegram_secret.ts"
  );
  const res = await validateTelegramHeader(req);
  assertStrictEquals(res, null);

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

Deno.test("accepts secrets with surrounding whitespace in header", async () => {
  setTestEnv({
    TELEGRAM_WEBHOOK_SECRET: "s3cr3t",
    ALLOWED_ORIGINS: "*",
  });

  const req = new Request("https://example.com/telegram-bot", {
    method: "POST",
    headers: {
      "x-telegram-bot-api-secret-token": "  s3cr3t \n",
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

Deno.test("accepts normalized bot_settings secrets", async () => {
  const original = getSetting;
  const stub =
    (async (_key: string) =>
      new TextEncoder().encode("s3cr3t\n")) as unknown as typeof getSetting;
  __setGetSetting(stub);

  try {
    setTestEnv({ ALLOWED_ORIGINS: "*" });
    const req = new Request("https://example.com/telegram-bot", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "s3cr3t" },
      body: "{}",
    });

    const { validateTelegramHeader } = await import(
      "../_shared/telegram_secret.ts"
    );
    const res = await validateTelegramHeader(req);
    assertStrictEquals(res, null);
  } finally {
    clearTestEnv();
    __setGetSetting(original);
  }
});

Deno.test("accepts DataView bot_settings secrets", async () => {
  const original = getSetting;
  const bytes = new TextEncoder().encode("s3cr3t\n");
  const stub =
    (async (_key: string) =>
      new DataView(bytes.buffer)) as unknown as typeof getSetting;
  __setGetSetting(stub);

  try {
    setTestEnv({ ALLOWED_ORIGINS: "*" });
    const req = new Request("https://example.com/telegram-bot", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "s3cr3t" },
      body: "{}",
    });

    const { validateTelegramHeader } = await import(
      "../_shared/telegram_secret.ts"
    );
    const res = await validateTelegramHeader(req);
    assertStrictEquals(res, null);
  } finally {
    clearTestEnv();
    __setGetSetting(original);
  }
});
