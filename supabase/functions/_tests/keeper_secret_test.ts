import { assert, assertEquals } from "std/assert/mod.ts";
import { ensureWebhookSecret } from "../_shared/telegram_secret.ts";

type SupabaseLike = Parameters<typeof ensureWebhookSecret>[0];

function mockSupa(
  setting: { setting_value: unknown } | null,
  onUpsert?: (values: Record<string, unknown>) => void,
): SupabaseLike {
  return {
    from: () => {
      const query = {
        eq: () => query,
        limit: () => query,
        maybeSingle: () => Promise.resolve({ data: setting }),
      };
      return {
        select: () => query,
        upsert: (values: Record<string, unknown>) => {
          onUpsert?.(values);
          return Promise.resolve({ error: undefined });
        },
      };
    },
  };
}

Deno.test("keeper: uses DB secret if present", async () => {
  const supa = mockSupa({ setting_value: "db" });
  const secret = await ensureWebhookSecret(supa, "env");
  assert(secret === "db");
});

Deno.test("keeper: normalizes DB secret values", async () => {
  const supa = mockSupa({ setting_value: " db \n" });
  const secret = await ensureWebhookSecret(supa, "env");
  assertEquals(secret, "db");
});

Deno.test("keeper: decodes Uint8Array secrets", async () => {
  const supa = mockSupa({
    setting_value: new TextEncoder().encode("db\n"),
  });
  const secret = await ensureWebhookSecret(supa, "env");
  assertEquals(secret, "db");
});

Deno.test("keeper: falls back to env secret", async () => {
  const supa = mockSupa(null);
  const secret = await ensureWebhookSecret(supa, "env");
  assert(secret === "env");
});

Deno.test("keeper: trims env fallback before storing", async () => {
  let stored: unknown;
  const supa = mockSupa(null, (values) => {
    stored = values.setting_value;
  });
  const secret = await ensureWebhookSecret(supa, " env \n");
  assertEquals(secret, "env");
  assertEquals(stored, "env");
});

Deno.test("keeper: trims process env fallback", async () => {
  let stored: unknown;
  const supa = mockSupa(null, (values) => {
    stored = values.setting_value;
  });
  Deno.env.set("TELEGRAM_WEBHOOK_SECRET", " env2 \n");
  try {
    const secret = await ensureWebhookSecret(supa, null);
    assertEquals(secret, "env2");
    assertEquals(stored, "env2");
  } finally {
    Deno.env.delete("TELEGRAM_WEBHOOK_SECRET");
  }
});

Deno.test("keeper: generates if none", async () => {
  const supa = mockSupa(null);
  const secret = await ensureWebhookSecret(supa, null);
  assert(typeof secret === "string" && secret.length >= 16);
});
