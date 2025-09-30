import { assertEquals } from "std/assert/mod.ts";

Deno.env.set("MINI_APP_URL", "https://example.com");
const { clampTtl, MAX_TTL } = await import("../auth/telegram-init/index.ts");

Deno.test("clampTtl limits ttl", () => {
  assertEquals(clampTtl(30), 30);
  assertEquals(clampTtl(MAX_TTL * 10), MAX_TTL);
});
