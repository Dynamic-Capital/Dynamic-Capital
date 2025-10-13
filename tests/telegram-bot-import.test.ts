import test from "node:test";
import { freshImport } from "./utils/freshImport.ts";

type EnvKey =
  | "SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SUPABASE_ANON_KEY"
  | "TELEGRAM_BOT_TOKEN"
  | "TELEGRAM_BOT_USERNAME";

const ENV_KEYS: EnvKey[] = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_BOT_USERNAME",
];

const REQUIRED_MOCK_ENV: Partial<Record<EnvKey, string>> = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  SUPABASE_ANON_KEY: "anon-key",
  TELEGRAM_BOT_TOKEN: "test-token",
  TELEGRAM_BOT_USERNAME: "testbot",
};

test("telegram bot module imports successfully with minimal env", async () => {
  const prior: Partial<Record<EnvKey, string>> = {};
  for (const key of ENV_KEYS) {
    if (typeof process.env[key] === "string") {
      prior[key] = process.env[key] as string;
    }
    if (REQUIRED_MOCK_ENV[key]) {
      process.env[key] = REQUIRED_MOCK_ENV[key] as string;
    } else {
      delete process.env[key];
    }
  }

  const globalAny = globalThis as {
    __SUPABASE_SKIP_AUTO_SERVE__?: boolean;
    __SUPA_MOCK__?: { tables: Record<string, unknown> };
  };
  const prevSkip = globalAny.__SUPABASE_SKIP_AUTO_SERVE__;
  const prevMock = globalAny.__SUPA_MOCK__;
  globalAny.__SUPABASE_SKIP_AUTO_SERVE__ = true;
  globalAny.__SUPA_MOCK__ = { tables: {} };

  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    if (!mod || typeof mod !== "object") {
      throw new Error("telegram-bot module import returned unexpected value");
    }
  } finally {
    for (const key of ENV_KEYS) {
      const value = prior[key];
      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
    if (typeof prevSkip === "boolean") {
      globalAny.__SUPABASE_SKIP_AUTO_SERVE__ = prevSkip;
    } else {
      delete globalAny.__SUPABASE_SKIP_AUTO_SERVE__;
    }
    if (prevMock) {
      globalAny.__SUPA_MOCK__ = prevMock;
    } else {
      delete globalAny.__SUPA_MOCK__;
    }
  }
});
