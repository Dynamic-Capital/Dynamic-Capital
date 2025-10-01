import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";

const supaState: any = { tables: {} };
(globalThis as any).__SUPA_MOCK__ = supaState;

function setEnv() {
  process.env.TELEGRAM_BOT_TOKEN = "testtoken";
  process.env.TELEGRAM_WEBHOOK_SECRET = "testsecret";
  process.env.SUPABASE_URL = "http://local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.MINI_APP_URL = "https://example.com/";
}

function cleanup() {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.MINI_APP_URL;
  supaState.tables = {};
}

test("callback edits message instead of sending new one", async () => {
  setEnv();
  supaState.tables = {
    bot_users: [{ id: "u1", telegram_id: 1, menu_message_id: null }],
    subscription_plans: [{
      id: "p1",
      name: "Test Plan",
      price: 10,
      currency: "USD",
      duration_months: 1,
      is_lifetime: false,
      features: [],
    }],
  };
  const calls: Array<{ url: string; body: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = String(input);
    if (url.startsWith("https://api.telegram.org")) {
      calls.push({ url, body: init?.body ? String(init.body) : "" });
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 42 } }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 200 });
  };
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    const reqStart = new Request("https://example.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "testsecret",
      },
      body: JSON.stringify({
        message: { text: "/start", chat: { id: 1 }, from: { id: 1 } },
      }),
    });
    const resStart = await mod.serveWebhook(reqStart);
    assertEquals(resStart.status, 200);
    const first = JSON.parse(calls[0].body);
    assertEquals(first.chat_id, 1);
    assertEquals(
      first.reply_markup.inline_keyboard[0][0].callback_data,
      "nav:dashboard",
    );

    const reqPlans = new Request("https://example.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "testsecret",
      },
      body: JSON.stringify({
        callback_query: {
          id: "cb1",
          from: { id: 1 },
          data: "nav:plans",
          message: { chat: { id: 1 }, message_id: 42 },
        },
      }),
    });
    const resPlans = await mod.serveWebhook(reqPlans);
    assertEquals(resPlans.status, 200);
    assertEquals(calls[1].url.includes("answerCallbackQuery"), true);
    assertEquals(calls[2].body.includes('"message_id":42'), true);

    const reqDash = new Request("https://example.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "testsecret",
      },
      body: JSON.stringify({
        callback_query: {
          id: "cb2",
          from: { id: 1 },
          data: "nav:dashboard",
          message: { chat: { id: 1 }, message_id: 42 },
        },
      }),
    });
    const resDash = await mod.serveWebhook(reqDash);
    assertEquals(resDash.status, 200);
    assertEquals(calls[3].url.includes("answerCallbackQuery"), true);
    assertEquals(calls[4].body.includes('"message_id":42'), true);

    assertEquals(calls.length, 5);
    assertEquals(calls[2].url.includes("editMessageText"), true);
    assertEquals(calls[4].url.includes("editMessageText"), true);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
