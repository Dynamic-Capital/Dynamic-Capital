import test from "node:test";
import { equal, rejects } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";

const CONFIG_DISABLED = /Supabase configuration is missing/;

test("utils/config falls back to defaults when Supabase env vars are missing", async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const { configClient } = await freshImport(
    new URL("../apps/web/utils/config.ts", import.meta.url),
  );
  equal(await configClient.getFlag("test_feature", true), true);
  await rejects(configClient.setFlag("test_feature", true), CONFIG_DISABLED);
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
  else delete process.env.SUPABASE_URL;
  if (prevKey !== undefined) process.env.SUPABASE_ANON_KEY = prevKey;
  else delete process.env.SUPABASE_ANON_KEY;
});

test("utils/config rejects null-like env values", async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = "null";
  process.env.SUPABASE_ANON_KEY = "undefined";
  const { configClient } = await freshImport(
    new URL("../apps/web/utils/config.ts", import.meta.url),
  );
  equal(await configClient.getFlag("test_feature", false), false);
  await rejects(configClient.publish(), CONFIG_DISABLED);
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
  else delete process.env.SUPABASE_URL;
  if (prevKey !== undefined) process.env.SUPABASE_ANON_KEY = prevKey;
  else delete process.env.SUPABASE_ANON_KEY;
});
