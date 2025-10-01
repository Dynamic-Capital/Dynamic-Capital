import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEquals,
  match as assertMatch,
  ok as assert,
} from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
function setEnv() {
  process.env.TELEGRAM_BOT_TOKEN = "token";
  process.env.TELEGRAM_WEBHOOK_SECRET = "secret";
  process.env.SUPABASE_URL = "http://example.com";
}

function cleanupEnv() {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.SUPABASE_URL;
}

test("setup-telegram-webhook calls Telegram API", async () => {
  setEnv();
  const calls: { url: string; body?: string | null }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string"
      ? input
      : input instanceof Request
      ? input.url
      : String(input);
    calls.push({ url, body: init?.body ? String(init.body) : null });
    if (url.includes("deleteWebhook") || url.includes("setWebhook")) {
      return new Response(JSON.stringify({ ok: true, result: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  let patched: URL | undefined;
  try {
    const orig = new URL(
      "../supabase/functions/setup-telegram-webhook/index.ts",
      import.meta.url,
    );
    patched = new URL(
      "../supabase/functions/setup-telegram-webhook/index.test.ts",
      import.meta.url,
    );
    const src = await Deno.readTextFile(orig);
    await Deno.writeTextFile(
      patched,
      src
        .replace(
          "../_shared/telegram_secret.ts",
          "../../../tests/telegram-secret-stub.ts",
        )
        .replace("../_shared/serve.ts", "../../../tests/serve-stub.ts"),
    );
    const { handler } = await freshImport(patched);
    const res = await handler(
      new Request("http://localhost", { method: "POST" }),
    );
    assertEquals(res.status, 200);
    const data = await res.json();
    assertDeepEqual(data, {
      success: true,
      webhook_set: true,
      webhook_url: "http://example.com/functions/v1/telegram-bot",
    });
    assertEquals(calls.length, 2);
    const setCall = calls.find((c) => c.url.includes("setWebhook"))!;
    const payload = JSON.parse(setCall.body!);
    assertEquals(payload.secret_token, "secret");
    assertEquals(payload.url, "http://example.com/functions/v1/telegram-bot");
  } finally {
    globalThis.fetch = originalFetch;
    if (patched) await Deno.remove(patched).catch(() => {});
    cleanupEnv();
  }
});

test("telegram-webhook processes /ping and responds", async () => {
  setEnv();
  const calls: { url: string; body?: string | null }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: Request | string | URL,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string"
      ? input
      : input instanceof Request
      ? input.url
      : String(input);
    calls.push({ url, body: init?.body ? String(init.body) : null });
    if (url.startsWith("http://example.com/rest/v1/webhook_updates")) {
      return new Response(JSON.stringify([{ update_id: 1 }]), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.startsWith("https://api.telegram.org")) {
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 1 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  let patched: URL | undefined;
  try {
    const orig = new URL(
      "../supabase/functions/telegram-webhook/index.ts",
      import.meta.url,
    );
    patched = new URL(
      "../supabase/functions/telegram-webhook/index.test.ts",
      import.meta.url,
    );
    let src = await Deno.readTextFile(orig);
    src = src.replace(
      "../_shared/client.ts",
      "../../../tests/supabase-client-stub.ts",
    );
    src = src.replace("../_shared/config.ts", "../../../tests/config-stub.ts");
    src = src.replace(
      "../_shared/miniapp.ts",
      "../../../tests/miniapp-stub.ts",
    );
    src = src.replace(
      "../_shared/telegram_secret.ts",
      "../../../tests/telegram-secret-stub.ts",
    );
    src = src.replace("../_shared/serve.ts", "../../../tests/serve-stub.ts");
    await Deno.writeTextFile(patched, src);
    const { default: handler } = await freshImport(patched);
    const req = new Request("http://localhost/telegram-webhook", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": "secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        update_id: 1,
        message: { text: "/ping", chat: { id: 42 } },
      }),
    });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertDeepEqual(data, { ok: true });
    const telegramCall = calls.find((c) => c.url.includes("sendMessage"))!;
    const payload = JSON.parse(telegramCall.body!);
    assertEquals(payload.chat_id, 42);
    assertMatch(payload.text, /pong/);
  } finally {
    globalThis.fetch = originalFetch;
    if (patched) await Deno.remove(patched).catch(() => {});
    cleanupEnv();
  }
});
