import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";
import process from "node:process";

test("envOrSetting prefers env over bot_setting", async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevAnon = process.env.SUPABASE_ANON_KEY;
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://example.com";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  const cfg = await import(
    /* @vite-ignore */ "../supabase/functions/_shared/config.ts"
  );
  process.env.EXAMPLE_KEY = "env-value";
  const original = cfg.getSetting;
  cfg.__setGetSetting(
    (() => Promise.resolve("db-value")) as typeof cfg.getSetting,
  );
  const val = await cfg.envOrSetting("EXAMPLE_KEY", "EXAMPLE_KEY");
  assertEquals(val, "env-value");
  cfg.__setGetSetting(original);
  delete process.env.EXAMPLE_KEY;
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
  else delete process.env.SUPABASE_URL;
  if (prevAnon !== undefined) process.env.SUPABASE_ANON_KEY = prevAnon;
  else delete process.env.SUPABASE_ANON_KEY;
  if (prevService !== undefined) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
  } else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test("envOrSetting ignores null-like env values", async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevAnon = process.env.SUPABASE_ANON_KEY;
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://example.com";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  const cfg = await import(
    /* @vite-ignore */ "../supabase/functions/_shared/config.ts"
  );
  process.env.EXAMPLE_KEY = "null";
  const original = cfg.getSetting;
  cfg.__setGetSetting(
    (() => Promise.resolve("db-value")) as typeof cfg.getSetting,
  );
  const val = await cfg.envOrSetting("EXAMPLE_KEY", "EXAMPLE_KEY");
  assertEquals(val, "db-value");
  cfg.__setGetSetting(original);
  delete process.env.EXAMPLE_KEY;
  if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
  else delete process.env.SUPABASE_URL;
  if (prevAnon !== undefined) process.env.SUPABASE_ANON_KEY = prevAnon;
  else delete process.env.SUPABASE_ANON_KEY;
  if (prevService !== undefined) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
  } else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
