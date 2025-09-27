// Reuse the env helper from the web app to avoid maintaining a separate copy
import { optionalEnvVar } from "../apps/web/utils/env.ts";
import { celebrate, info, success, warn } from "./utils/friendly-logger.js";

const SUPABASE_URL = optionalEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnvVar("SUPABASE_ANON_KEY");
const SITE_URL = optionalEnvVar("SITE_URL");

const placeholders: string[] = [];

if (!SUPABASE_URL) {
  process.env.SUPABASE_URL = "https://stub.supabase.co";
  placeholders.push("SUPABASE_URL → https://stub.supabase.co");
}
if (!SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = "stub-anon-key";
  placeholders.push("SUPABASE_ANON_KEY → stub-anon-key");
}
if (!SITE_URL) {
  const fallbackOrigin = "http://localhost:8080";
  process.env.SITE_URL = fallbackOrigin;
  process.env.NEXT_PUBLIC_SITE_URL = fallbackOrigin;
  placeholders.push(
    "SITE_URL & NEXT_PUBLIC_SITE_URL → http://localhost:8080",
  );
  if (!process.env.MINIAPP_ORIGIN) {
    process.env.MINIAPP_ORIGIN = fallbackOrigin;
    placeholders.push("MINIAPP_ORIGIN → http://localhost:8080");
  }
}

if (placeholders.length > 0) {
  warn(
    "Some environment variables were missing. Friendly placeholders were added so the Codex CLI keeps humming.",
    { details: placeholders },
  );
} else {
  success("All required environment variables are already set. 🌟");
}

if (!process.env.MINIAPP_ORIGIN && process.env.SITE_URL) {
  process.env.MINIAPP_ORIGIN = process.env.SITE_URL;
  info(
    `MINIAPP_ORIGIN defaulted to ${process.env.MINIAPP_ORIGIN} to match SITE_URL.`,
  );
} else if (process.env.MINIAPP_ORIGIN) {
  info(`MINIAPP_ORIGIN is set to ${process.env.MINIAPP_ORIGIN}.`);
}

celebrate("Codex CLI environment bootstrap complete. Happy building!");
