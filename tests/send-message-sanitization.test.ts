import test from "node:test";
import { equal as assertEquals, ok as assertOk } from "node:assert/strict";

test("sendMessage retries without Markdown on parse errors", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: string }> = [];
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;

  process.env.TELEGRAM_BOT_TOKEN = "test-token";

  const {
    sendMessage,
    setCallbackMessageId,
  } = await import("../supabase/functions/telegram-bot/admin-handlers/common.ts");

  setCallbackMessageId(null);

  globalThis.fetch = async (input: Request | string | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const body = init?.body ? String(init.body) : "";
    calls.push({ url, body });

    if (calls.length === 1) {
      return new Response(
        "can't parse entities: Character '_' is reserved and must be escaped",
        { status: 400 },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, result: { message_id: 99 } }),
      { status: 200 },
    );
  };

  try {
    const response = await sendMessage(123, "hello_world");

    assertEquals(calls.length, 2);

    const firstPayload = JSON.parse(calls[0].body);
    assertEquals(firstPayload.parse_mode, "MarkdownV2");
    assertEquals(firstPayload.text, "hello\\_world");

    const secondPayload = JSON.parse(calls[1].body);
    assertEquals("parse_mode" in secondPayload, false);
    assertEquals(secondPayload.text, "hello_world");

    assertOk(response?.ok);
    assertEquals(response?.result?.message_id, 99);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalToken;
    }
    setCallbackMessageId(null);
  }
});
