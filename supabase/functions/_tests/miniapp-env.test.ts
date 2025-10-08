(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

async function importMiniappModule() {
  return await import(
    `../_shared/miniapp.ts?cache=${crypto.randomUUID()}`
  );
}

Deno.test("normalizeMiniAppUrl trims and coerces values", async (t) => {
  const { normalizeMiniAppUrl } = await importMiniappModule();

  const cases = [
    {
      name: "adds https and trailing slash",
      input: " mini.dynamic.capital/miniapp ",
      expected: "https://mini.dynamic.capital/miniapp/",
    },
    {
      name: "preserves query parameters",
      input: "https://mini.dynamic.capital/app?ref=bot",
      expected: "https://mini.dynamic.capital/app?ref=bot",
    },
    {
      name: "supports localhost http",
      input: "http://localhost:54321/miniapp",
      expected: "http://localhost:54321/miniapp/",
    },
  ] as const;

  for (const { name, input, expected } of cases) {
    await t.step(name, () => {
      assertEquals(normalizeMiniAppUrl(input), expected);
    });
  }

  await t.step("invalid values return null", () => {
    assertEquals(normalizeMiniAppUrl("not a url"), null);
    assertEquals(normalizeMiniAppUrl(""), null);
    assertEquals(normalizeMiniAppUrl(undefined), null);
  });
});

Deno.test("readMiniAppEnv normalizes configured URL", async () => {
  setTestEnv({
    MINI_APP_URL: "mini.dynamic.capital/miniapp",
  });
  try {
    const { readMiniAppEnv } = await importMiniappModule();
    const result = await readMiniAppEnv();
    assertEquals(result.url, "https://mini.dynamic.capital/miniapp/");
    assertEquals(result.ready, true);
  } finally {
    clearTestEnv();
  }
});

Deno.test("readMiniAppEnv falls back to function URL when needed", async () => {
  setTestEnv({
    SUPABASE_URL: "https://project.supabase.co",
  });
  try {
    const { readMiniAppEnv } = await importMiniappModule();
    const result = await readMiniAppEnv();
    assert(result.url?.startsWith("https://project.functions.supabase.co/miniapp"));
    assertEquals(result.ready, true);
  } finally {
    clearTestEnv();
  }
});
