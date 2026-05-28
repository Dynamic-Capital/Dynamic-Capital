import { assertEquals } from "std/testing/asserts.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("telegram-setwebhook targets the canonical telegram-bot endpoint", async () => {
  setTestEnv({
    TELEGRAM_BOT_TOKEN: "token",
    SUPABASE_URL: "https://project-ref.supabase.co",
  });

  const { handler } = await import(
    `../telegram-setwebhook/index.ts?cache=${crypto.randomUUID()}`
  );
  const res = await handler(
    new Request("https://example.com/telegram-setwebhook?dry=1"),
  );
  const payload = await res.json();

  assertEquals(payload.ok, true);
  assertEquals(
    payload.target,
    "https://project-ref.functions.supabase.co/telegram-bot",
  );

  clearTestEnv();
});
