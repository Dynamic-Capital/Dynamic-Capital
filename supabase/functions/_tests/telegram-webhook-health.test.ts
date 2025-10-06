import { assertEquals, assertMatch } from "std/testing/asserts.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("telegram-webhook health endpoints respond", async (t) => {
  setTestEnv({ TELEGRAM_WEBHOOK_SECRET: "s3cr3t" });
  const { default: handler } = await import(
    "../telegram-webhook/index.ts?health"
  );

  await t.step("GET /telegram-webhook returns ok", async () => {
    const req = new Request(
      "https://example.com/functions/v1/telegram-webhook",
      { method: "GET" },
    );
    const res = await handler(req);
    assertEquals(res.status, 200);
    assertEquals(
      res.headers.get("content-type"),
      "application/json; charset=utf-8",
    );
    const payload = await res.json();
    assertEquals(payload.ok, true);
    assertEquals(payload.name, "telegram-webhook");
    assertMatch(payload.ts, /T/);
  });

  await t.step("GET /telegram-webhook/version returns ok", async () => {
    const req = new Request(
      "https://example.com/functions/v1/telegram-webhook/version",
      { method: "GET" },
    );
    const res = await handler(req);
    assertEquals(res.status, 200);
    const payload = await res.json();
    assertEquals(payload.ok, true);
    assertEquals(payload.name, "telegram-webhook");
    assertMatch(payload.ts, /T/);
  });

  await t.step("HEAD /telegram-webhook shares allow header", async () => {
    const req = new Request(
      "https://example.com/functions/v1/telegram-webhook",
      { method: "HEAD" },
    );
    const res = await handler(req);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Allow"), "GET,HEAD,POST,OPTIONS");
    assertEquals(
      res.headers.get("access-control-allow-methods"),
      "GET,HEAD,POST,OPTIONS",
    );
    const text = await res.text();
    assertEquals(text, "");
  });

  clearTestEnv();
});
