import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
import process from "node:process";

(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

interface SupaMockState {
  tables: Record<string, unknown>;
}

type GlobalWithSupaMock = typeof globalThis & { __SUPA_MOCK__?: SupaMockState };

const supaState: SupaMockState = { tables: {} };
const globalWithSupaMock = globalThis as GlobalWithSupaMock;
globalWithSupaMock.__SUPA_MOCK__ = supaState;

function setEnv() {
  process.env.SUPABASE_URL = "http://local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.TELEGRAM_BOT_TOKEN = "tok";
}

function cleanup() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.TELEGRAM_BOT_TOKEN;
  supaState.tables = {};
}

test("sendMessage escapes HTML characters", async () => {
  setEnv();
  type TelegramPayload = { text: string } & Record<string, unknown>;
  const payloads: TelegramPayload[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((
    _input: Request | string,
    init?: RequestInit,
  ) => {
    const parsed = JSON.parse(String(init?.body)) as TelegramPayload;
    payloads.push(parsed);
    const response = new Response(
      JSON.stringify({ ok: true, result: { message_id: 1 } }),
      { status: 200 },
    );
    return Promise.resolve(response);
  }) as typeof globalThis.fetch;
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    await mod.sendMessage(1, "<script>alert(1)</script>");
    assertEquals(payloads[0].text, "&lt;script&gt;alert(1)&lt;/script&gt;");
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("sendMessage normalizes HTML parse mode casing", async () => {
  setEnv();
  type TelegramPayload =
    & { text: string; parse_mode?: string }
    & Record<string, unknown>;
  const payloads: TelegramPayload[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((
    _input: Request | string,
    init?: RequestInit,
  ) => {
    const parsed = JSON.parse(String(init?.body)) as TelegramPayload;
    payloads.push(parsed);
    const response = new Response(
      JSON.stringify({ ok: true, result: { message_id: 1 } }),
      { status: 200 },
    );
    return Promise.resolve(response);
  }) as typeof globalThis.fetch;
  try {
    const mod = await freshImport(
      new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
    );
    await mod.sendMessage(1, "<b>hi</b>", { parse_mode: "html" });
    assertEquals(payloads[0].text, "&lt;b&gt;hi&lt;/b&gt;");
    assertEquals(payloads[0].parse_mode, "HTML");
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});
