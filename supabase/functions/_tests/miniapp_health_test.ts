import { FakeSupa } from "./helpers.ts";
import { requireMiniAppEnv } from "../_shared/miniapp.ts";

function assert(
  condition: unknown,
  message = "Assertion failed",
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  const same = Object.is(actual, expected) ||
    JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    throw new Error(
      message ??
        `Expected ${JSON.stringify(actual)} to equal ${
          JSON.stringify(expected)
        }`,
    );
  }
}

function assertThrows(fn: () => unknown, message?: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert(threw, message ?? "Expected function to throw");
}

Deno.test("miniapp-health: null when user not found", async () => {
  Deno.env.set("SUPABASE_URL", "https://example.com");
  Deno.env.set("SUPABASE_ANON_KEY", "anon");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service");
  const { getVipForTelegram } = await import("../miniapp-health/vip.ts");
  type SupabaseLike = Parameters<typeof getVipForTelegram>[0];
  const supa = FakeSupa() as unknown as SupabaseLike;
  const vip = await getVipForTelegram(supa, "2255");
  assertEquals(vip, null);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_ANON_KEY");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
});

Deno.test(
  "requireMiniAppEnv: throws when env missing and no auto-derived URL",
  () => {
    Deno.env.delete("MINI_APP_URL");
    Deno.env.delete("MINI_APP_SHORT_NAME");
    Deno.env.delete("SUPABASE_URL");
    Deno.env.delete("SUPABASE_PROJECT_ID");
    assertThrows(() => requireMiniAppEnv());
  },
);

Deno.test("requireMiniAppEnv: passes when MINI_APP_URL set", () => {
  Deno.env.set("MINI_APP_URL", "https://example.com/");
  Deno.env.delete("MINI_APP_SHORT_NAME");
  requireMiniAppEnv();
  Deno.env.delete("MINI_APP_URL");
});

Deno.test("requireMiniAppEnv: passes when MINI_APP_SHORT_NAME set", () => {
  Deno.env.delete("MINI_APP_URL");
  Deno.env.set("MINI_APP_SHORT_NAME", "short");
  requireMiniAppEnv();
  Deno.env.delete("MINI_APP_SHORT_NAME");
});

Deno.test(
  "requireMiniAppEnv: uses Supabase project metadata when configured",
  () => {
    Deno.env.delete("MINI_APP_URL");
    Deno.env.delete("MINI_APP_SHORT_NAME");
    Deno.env.set("SUPABASE_URL", "https://example-project.supabase.co");
    requireMiniAppEnv();
    Deno.env.delete("SUPABASE_URL");
  },
);
