import { assertEquals } from "std/testing/asserts.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("telegram-bot HEAD endpoint advertises allowed methods", async () => {
  setTestEnv({ SUPABASE_URL: "https://example.com" });
  Deno.env.set("TELEGRAM_BOT_TOKEN", "token");

  try {
    const { serveWebhook } = await import("../telegram-bot/health.ts");

    const req = new Request(
      "https://project.functions.supabase.co/telegram-bot",
      { method: "HEAD" },
    );
    const res = await serveWebhook(req);

    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Allow"), "GET,HEAD,POST,OPTIONS");
    assertEquals(
      res.headers.get("Access-Control-Allow-Methods"),
      "GET,HEAD,POST,OPTIONS",
    );
    assertEquals(await res.text(), "");
  } finally {
    clearTestEnv();
    Deno.env.delete("TELEGRAM_BOT_TOKEN");
  }
});
