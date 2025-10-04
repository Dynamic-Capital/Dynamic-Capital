(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assertEquals } from "std/assert/mod.ts";

const functionUrl =
  "http://localhost/functions/v1/promo-auto-generate" as const;

Deno.test("promo-auto-generate requires secret configuration", async () => {
  Deno.env.delete("PROMO_AUTOGEN_SECRET");

  const { handler } = await import(
    `../promo-auto-generate/index.ts?cache=${crypto.randomUUID()}`
  );

  const response = await handler(new Request(functionUrl, { method: "POST" }));
  assertEquals(response.status, 401);
  const body = await response.json() as { ok: boolean; error: string };
  assertEquals(body.ok, false);
  assertEquals(body.error, "Promo generator secret is not configured");

  Deno.env.delete("PROMO_AUTOGEN_SECRET");
});

Deno.test("promo-auto-generate rejects invalid secret", async () => {
  Deno.env.set("PROMO_AUTOGEN_SECRET", "expected-secret");

  const { handler } = await import(
    `../promo-auto-generate/index.ts?cache=${crypto.randomUUID()}`
  );

  const response = await handler(
    new Request(functionUrl, {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    }),
  );

  assertEquals(response.status, 401);
  const body = await response.json() as { ok: boolean; error: string };
  assertEquals(body.ok, false);
  assertEquals(body.error, "Invalid promo generator secret");

  Deno.env.delete("PROMO_AUTOGEN_SECRET");
});
