import { assertEquals } from "std/assert/mod.ts";
import { setTestEnv, clearTestEnv } from "./env-mock.ts";

Deno.test("checkout-init rejects unauthenticated requests", async () => {
  setTestEnv({
    SUPABASE_URL: "https://example.com",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "srv",
  });

  const { handler } = await import("../checkout-init/index.ts");

  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: "p1", method: "bank_transfer" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 401);

  clearTestEnv();
});
