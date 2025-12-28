(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assertEquals } from "std/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

Deno.test("create-checkout rejects unauthenticated requests", async () => {
  setTestEnv({
    SUPABASE_URL: "https://example.com",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "srv",
  });

  const { handler } = await import("../create-checkout/index.ts");

  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: "plan_1", method: "bank_transfer" }),
  });

  const res = await handler(req);
  assertEquals(res.status, 401);

  clearTestEnv();
});
