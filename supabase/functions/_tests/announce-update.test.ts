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

Deno.test("resolveMiniAppUrl normalizes env-provided values", async (t) => {
  const cases = [
    {
      name: "trims whitespace and adds trailing slash",
      input: " https://dynamiccapital.ton ",
      expected: "https://dynamiccapital.ton/",
    },
    {
      name: "adds protocol when missing",
      input: "dynamiccapital.ton",
      expected: "https://dynamiccapital.ton/",
    },
    {
      name: "preserves existing path and query",
      input: "https://dynamiccapital.ton/app?ref=bot",
      expected: "https://dynamiccapital.ton/app?ref=bot",
    },
    {
      name: "preserves non-https protocols",
      input: "http://localhost:3000/app",
      expected: "http://localhost:3000/app",
    },
  ] as const;

  for (const { name, input, expected } of cases) {
    await t.step(name, async () => {
      Deno.env.set("MINI_APP_URL", input);
      try {
        const resolved = await resolveMiniAppUrl();
        assertEquals(resolved, expected);
      } finally {
        Deno.env.delete("MINI_APP_URL");
      }
    });
  }
});

Deno.test("resolveMiniAppUrl falls back to config setting when env missing", async () => {
  Deno.env.delete("MINI_APP_URL");
  const resolved = await withSettingOverride(
    async (_key) => " dynamiccapital.ton ",
    () => resolveMiniAppUrl(),
  );
  assertEquals(resolved, "https://dynamiccapital.ton/");
});

Deno.test("resolveMiniAppUrl returns default when nothing configured", async () => {
  Deno.env.delete("MINI_APP_URL");
  const resolved = await withSettingOverride(
    async (_key) => null,
    () => resolveMiniAppUrl(),
  );
  assertEquals(resolved, "https://dynamiccapital.ton/");
});

Deno.test("resolveMiniAppUrl ignores invalid configuration and falls back", async () => {
  Deno.env.delete("MINI_APP_URL");
  const resolved = await withSettingOverride(
    async (_key) => "nota url",
    () => resolveMiniAppUrl(),
  );
  assertEquals(resolved, "https://dynamiccapital.ton/");
});
