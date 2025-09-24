import { assert } from "std/assert/mod.ts";
import { ensureWebhookSecret } from "../_shared/telegram_secret.ts";

type SupabaseLike = Parameters<typeof ensureWebhookSecret>[0];

function mockSupa(setting: { setting_value: string } | null): SupabaseLike {
  return {
    from: () => {
      const query = {
        eq: () => query,
        limit: () => query,
        maybeSingle: () => Promise.resolve({ data: setting }),
      };
      return {
        select: () => query,
        upsert: () => Promise.resolve({ error: undefined }),
      };
    },
  };
}

Deno.test("keeper: uses DB secret if present", async () => {
  const supa = mockSupa({ setting_value: "db" });
  const secret = await ensureWebhookSecret(supa, "env");
  assert(secret === "db");
});

Deno.test("keeper: falls back to env secret", async () => {
  const supa = mockSupa(null);
  const secret = await ensureWebhookSecret(supa, "env");
  assert(secret === "env");
});

Deno.test("keeper: generates if none", async () => {
  const supa = mockSupa(null);
  const secret = await ensureWebhookSecret(supa, null);
  assert(typeof secret === "string" && secret.length >= 16);
});
