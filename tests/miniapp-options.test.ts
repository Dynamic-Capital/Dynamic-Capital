import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
import process from "node:process";

interface SupaMockState {
  tables: Record<string, unknown>;
}

type GlobalWithSupaMock = typeof globalThis & { __SUPA_MOCK__?: SupaMockState };

const supaState: SupaMockState = { tables: {} };
const globalWithSupaMock = globalThis as GlobalWithSupaMock;
globalWithSupaMock.__SUPA_MOCK__ = supaState;

function setEnv() {
  process.env.TELEGRAM_BOT_TOKEN = "testtoken";
  process.env.TELEGRAM_WEBHOOK_SECRET = "testsecret";
  process.env.SUPABASE_URL = "http://local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  process.env.SUPABASE_ANON_KEY = "anon";
}

function cleanup() {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  supaState.tables = {};
}

test("sendMiniAppOrBotOptions uses nav:plans callback", async () => {
  setEnv();
  supaState.tables = {
    kv_config: [{
      key: "features:published",
      value: { data: { mini_app_enabled: false } },
    }],
  };
  const calls: Array<{ body: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: Request | string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("https://api.telegram.org")) {
      calls.push({ body: init?.body ? String(init.body) : "" });
      const response = new Response(
        JSON.stringify({ ok: true, result: { message_id: 1 } }),
        { status: 200 },
      );
      return Promise.resolve(response);
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof globalThis.fetch;
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    await mod.sendMiniAppOrBotOptions(1);
    const payload = JSON.parse(calls[0].body);
    assertEquals(
      payload.reply_markup.inline_keyboard[0][0].callback_data,
      "nav:plans",
    );
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
