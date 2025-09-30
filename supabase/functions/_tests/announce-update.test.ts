(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveMiniAppUrl } from "../announce-update/index.ts";
import { __setGetSetting, getSetting } from "../_shared/config.ts";

type GetSettingFn = typeof getSetting;

async function withSettingOverride<T>(
  override: GetSettingFn,
  fn: () => Promise<T>,
): Promise<T> {
  const original = getSetting;
  __setGetSetting(override);
  try {
    return await fn();
  } finally {
    __setGetSetting(original);
  }
}

Deno.test("resolveMiniAppUrl normalizes env value with trailing slash", async () => {
  Deno.env.set("MINI_APP_URL", " https://dynamiccapital.ton ");
  try {
    const resolved = await resolveMiniAppUrl();
    assertEquals(resolved, "https://www.dynamiccapital.ton/");
  } finally {
    Deno.env.delete("MINI_APP_URL");
  }
});

Deno.test("resolveMiniAppUrl preserves existing path and query", async () => {
  Deno.env.set("MINI_APP_URL", "https://dynamiccapital.ton/app?ref=bot");
  try {
    const resolved = await resolveMiniAppUrl();
    assertEquals(resolved, "https://www.dynamiccapital.ton/app?ref=bot");
  } finally {
    Deno.env.delete("MINI_APP_URL");
  }
});

Deno.test("resolveMiniAppUrl falls back to config setting when env missing", async () => {
  Deno.env.delete("MINI_APP_URL");
  const valueFromSetting = " https://dynamiccapital.ton ";
  const resolved = await withSettingOverride(
    async (_key) => valueFromSetting,
    () => resolveMiniAppUrl(),
  );
  assertEquals(resolved, "https://www.dynamiccapital.ton/");
});

Deno.test("resolveMiniAppUrl returns default when nothing configured", async () => {
  Deno.env.delete("MINI_APP_URL");
  const resolved = await withSettingOverride(
    async (_key) => null,
    () => resolveMiniAppUrl(),
  );
  assertEquals(resolved, "https://www.dynamiccapital.ton/");
});
