import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { withSecurity, ENHANCED_SECURITY_HEADERS } from "./security.ts";

Deno.test("withSecurity adds headers", () => {
  const resp = new Response("ok", { headers: { "content-type": "text/plain" } });
  const secured = withSecurity(resp);
  for (const [k, v] of Object.entries(ENHANCED_SECURITY_HEADERS)) {
    assertEquals(secured.headers.get(k), v);
  }
  assertEquals(secured.headers.get("x-miniapp-with-security"), "1");
});

