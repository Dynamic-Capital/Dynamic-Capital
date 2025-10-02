// Reuse the env helper from the web app to avoid maintaining a separate copy
import { optionalEnvVar } from "../apps/web/utils/env.ts";
import { celebrate, info, success, warn } from "./utils/friendly-logger.js";

const SUPABASE_URL = optionalEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnvVar("SUPABASE_ANON_KEY");
const SITE_URL = optionalEnvVar("SITE_URL");
const NEXT_PUBLIC_SITE_URL = optionalEnvVar("NEXT_PUBLIC_SITE_URL");

const placeholders: string[] = [];

if (!SUPABASE_URL) {
  process.env.SUPABASE_URL = "https://stub.supabase.co";
  placeholders.push("SUPABASE_URL → https://stub.supabase.co");
}
if (!SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = "stub-anon-key";
  placeholders.push("SUPABASE_ANON_KEY → stub-anon-key");
}
const fallbackOrigin = "http://localhost:3000";

if (!SITE_URL) {
  process.env.SITE_URL = fallbackOrigin;
  placeholders.push(`SITE_URL → ${fallbackOrigin}`);
}

const canonicalSiteUrl = process.env.SITE_URL ?? fallbackOrigin;

if (!NEXT_PUBLIC_SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = canonicalSiteUrl;
  placeholders.push(`NEXT_PUBLIC_SITE_URL → ${canonicalSiteUrl}`);
}

if (!process.env.MINIAPP_ORIGIN) {
  process.env.MINIAPP_ORIGIN = canonicalSiteUrl;
  placeholders.push(`MINIAPP_ORIGIN → ${canonicalSiteUrl}`);
}

if (placeholders.length > 0) {
  warn(
    "Some environment variables were missing. Friendly placeholders were added so the Codex CLI keeps humming.",
    { details: placeholders },
  );
} else {
  success("All required environment variables are already set. 🌟");
}

info(`MINIAPP_ORIGIN is set to ${process.env.MINIAPP_ORIGIN}.`);

celebrate("Codex CLI environment bootstrap complete. Happy building!");
