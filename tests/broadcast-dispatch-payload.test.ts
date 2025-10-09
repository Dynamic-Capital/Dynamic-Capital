import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEqual,
} from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";

test("buildTelegramPayload falls back to text for plain strings", async () => {
  const { buildTelegramPayload } = await freshImport(
    new URL(
      "../supabase/functions/broadcast-dispatch/index.ts",
      import.meta.url,
    ),
  );
  const payload = buildTelegramPayload("Hello world");
  assertDeepEqual(payload, { text: "Hello world" });
});

test("buildTelegramPayload parses structured JSON content", async () => {
  const { buildTelegramPayload } = await freshImport(
    new URL(
      "../supabase/functions/broadcast-dispatch/index.ts",
      import.meta.url,
    ),
  );
  const json = JSON.stringify({
    text: "Check out the Mini App!",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open Mini App", url: "https://example.com/miniapp" }],
      ],
    },
  });
  const payload = buildTelegramPayload(json);
  assertEqual(payload.text, "Check out the Mini App!");
  assertEqual(payload.parse_mode, "Markdown");
  assertDeepEqual(payload.reply_markup, {
    inline_keyboard: [
      [{ text: "Open Mini App", url: "https://example.com/miniapp" }],
    ],
  });
});

test("buildTelegramPayload ignores invalid JSON and returns text", async () => {
  const { buildTelegramPayload } = await freshImport(
    new URL(
      "../supabase/functions/broadcast-dispatch/index.ts",
      import.meta.url,
    ),
  );
  const payload = buildTelegramPayload('{"text": "missing quote}');
  assertDeepEqual(payload, { text: '{"text": "missing quote}' });
});

test("dispatchAudience forwards payload and tallies outcomes", async () => {
  const { dispatchAudience } = await freshImport(
    new URL(
      "../supabase/functions/broadcast-dispatch/index.ts",
      import.meta.url,
    ),
  );
  const basePayload = {
    text: "Dynamic Capital update",
    parse_mode: "Markdown",
  };
  const calls: Array<{ id: number; payload: unknown }> = [];
  const { success, failed } = await dispatchAudience(
    [1, 2, 3],
    basePayload,
    0,
    async (id, payload) => {
      calls.push({ id, payload });
      return id !== 2;
    },
  );
  assertEqual(success, 2);
  assertEqual(failed, 1);
  calls.forEach((call) => {
    assertDeepEqual(call.payload, basePayload);
  });
});

test("shouldSyncMiniApp honors boolean override and channel heuristics", async () => {
  const { shouldSyncMiniApp } = await freshImport(
    new URL(
      "../supabase/functions/broadcast-dispatch/index.ts",
      import.meta.url,
    ),
  );

  assertEqual(shouldSyncMiniApp(null), true, "null target defaults to sync");
  assertEqual(
    shouldSyncMiniApp({ syncMiniApp: false, channels: ["miniapp"] }),
    false,
    "explicit boolean override wins",
  );
  assertEqual(
    shouldSyncMiniApp({ channels: ["telegram", "web"] }),
    true,
    "web channel requires sync",
  );
  assertEqual(
    shouldSyncMiniApp({ channels: "telegram, telegram" }),
    false,
    "all-telegram string is treated as telegram-only",
  );
  assertEqual(
    shouldSyncMiniApp({ type: "internal" }),
    false,
    "internal broadcasts should stay telegram-only",
  );
});

test("extractAnnouncementText pulls human-readable text from payloads", async () => {
  const { extractAnnouncementText } = await freshImport(
    new URL(
      "../supabase/functions/broadcast-dispatch/index.ts",
      import.meta.url,
    ),
  );

  assertEqual(extractAnnouncementText(null), null);
  assertEqual(
    extractAnnouncementText("   Alpha drop incoming  "),
    "Alpha drop incoming",
  );

  const jsonWithCaption = JSON.stringify({ caption: "Trade ready" });
  assertEqual(extractAnnouncementText(jsonWithCaption), "Trade ready");

  const jsonWithFallback = JSON.stringify({ count: 2 });
  assertEqual(extractAnnouncementText(jsonWithFallback), jsonWithFallback);
});
