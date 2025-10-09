import { assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("payment-webhook rejects invalid signatures", async () => {
  setTestEnv({
    SUPABASE_URL: "https://example.com",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "srv",
    PAYMENT_WEBHOOK_SECRET: "test-secret",
  });

  const { handler } = await import("../payment-webhook/index.ts");

  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "payment.completed" }),
  });

  const res = await handler(req);
  assertEquals(res.status, 401);

  clearTestEnv();
});
