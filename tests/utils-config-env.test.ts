import test from "node:test";
import { equal, rejects } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
import { withEnv } from "./utils/withEnv.ts";

const CONFIG_DISABLED = /Supabase configuration is missing/;

test("utils/config falls back to defaults when Supabase env vars are missing", async () => {
  await withEnv({
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
  }, async () => {
    const { configClient } = await freshImport(
      new URL("../apps/web/utils/config.ts", import.meta.url),
    );
    equal(await configClient.getFlag("test_feature", true), true);
    await rejects(configClient.setFlag("test_feature", true), CONFIG_DISABLED);
  });
});

test("known feature flags default to enabled", async () => {
  await withEnv({
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
  }, async () => {
    const { configClient } = await freshImport(
      new URL("../apps/web/utils/config.ts", import.meta.url),
    );
    equal(await configClient.getFlag("broadcasts_enabled"), true);
  });
});

test("utils/config rejects null-like env values", async () => {
  await withEnv({
    SUPABASE_URL: "null",
    SUPABASE_ANON_KEY: "undefined",
  }, async () => {
    const { configClient } = await freshImport(
      new URL("../apps/web/utils/config.ts", import.meta.url),
    );
    equal(await configClient.getFlag("test_feature", false), false);
    await rejects(configClient.publish(), CONFIG_DISABLED);
  });
});

test("supabase runtime accepts NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY alias", async () => {
  await withEnv({
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
  }, async () => {
    const module = await freshImport(
      new URL("../apps/web/config/supabase-runtime.ts", import.meta.url),
    );

    equal(module.SUPABASE_URL, "https://example.supabase.co");
    equal(module.SUPABASE_ANON_KEY, "publishable");
    equal(module.SUPABASE_CONFIG_FROM_ENV, true);
  });
});
