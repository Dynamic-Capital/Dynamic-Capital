import test from "node:test";
import { equal as assertEquals, ok as assert } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";

const supaState: any = { tables: {} };
(globalThis as any).__SUPA_MOCK__ = supaState;

function setEnv(extra: Record<string, string> = {}) {
  process.env.SUPABASE_URL = "http://local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.TELEGRAM_WEBHOOK_SECRET = "secret";
  Object.assign(process.env, extra);
}

function cleanup() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.MINI_APP_URL;
  delete process.env.MINI_APP_SHORT_NAME;
  delete process.env.TELEGRAM_BOT_USERNAME;
  supaState.tables = {};
}

test("sendMiniAppLink returns URL when enabled with direct URL", async () => {
  setEnv({ TELEGRAM_BOT_TOKEN: "tok", MINI_APP_URL: "https://ma/" });
  supaState.tables = {
    kv_config: [{
      key: "features:published",
      value: { data: { mini_app_enabled: true } },
    }],
  };
  const calls: Array<{ body: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = String(input);
    if (url.startsWith("https://api.telegram.org")) {
      calls.push({ body: init?.body ? String(init.body) : "" });
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 1 } }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 200 });
  };
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    const url = await mod.sendMiniAppLink(1);
    assertEquals(url, "https://ma/");
    const payload = JSON.parse(calls[0].body);
    assertEquals(
      payload.reply_markup.inline_keyboard[0][0].web_app.url,
      "https://ma/",
    );
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("sendMiniAppLink returns deep link when short name configured", async () => {
  setEnv({
    TELEGRAM_BOT_TOKEN: "tok",
    MINI_APP_SHORT_NAME: "short",
    TELEGRAM_BOT_USERNAME: "mybot",
  });
  supaState.tables = {
    kv_config: [{
      key: "features:published",
      value: { data: { mini_app_enabled: true } },
    }],
  };
  const calls: Array<{ body: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = String(input);
    if (url.startsWith("https://api.telegram.org")) {
      calls.push({ body: init?.body ? String(init.body) : "" });
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 1 } }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 200 });
  };
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    const url = await mod.sendMiniAppLink(1);
    assertEquals(url, "https://t.me/mybot/short");
    const payload = JSON.parse(calls[0].body);
    assertEquals(
      payload.reply_markup.inline_keyboard[0][0].url,
      "https://t.me/mybot/short",
    );
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("sendMiniAppLink disabled", async () => {
  setEnv({ TELEGRAM_BOT_TOKEN: "tok" });
  supaState.tables = {
    kv_config: [{
      key: "features:published",
      value: { data: { mini_app_enabled: false } },
    }],
  };
  const calls: Array<{ body: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = String(input);
    if (url.startsWith("https://api.telegram.org")) {
      calls.push({ body: init?.body ? String(init.body) : "" });
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 1 } }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 200 });
  };
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    const url = await mod.sendMiniAppLink(1);
    assertEquals(url, null);
    assert(calls.length > 0);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("sendMiniAppLink with missing token", async () => {
  setEnv();
  supaState.tables = {
    kv_config: [{
      key: "features:published",
      value: { data: { mini_app_enabled: true } },
    }],
  };
  const calls: Array<{ body: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = String(input);
    if (url.startsWith("https://api.telegram.org")) {
      calls.push({ body: init?.body ? String(init.body) : "" });
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 1 } }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 200 });
  };
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    const url = await mod.sendMiniAppLink(1);
    assertEquals(url, null);
    assertEquals(calls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
