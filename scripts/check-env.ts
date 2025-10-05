// Reuse the env helper from the web app to avoid maintaining a separate copy
import { optionalEnvVar } from "../apps/web/utils/env.ts";
import { celebrate, info, success, warn } from "./utils/friendly-logger.js";

const DEFAULT_DYNAMIC_API_CACHE_TTL_SECONDS = "120";
const DEFAULT_DYNAMIC_REST_CACHE_TTL_SECONDS = "300";

const SUPABASE_URL = optionalEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnvVar("SUPABASE_ANON_KEY");
const SITE_URL = optionalEnvVar("SITE_URL");
const NEXT_PUBLIC_SITE_URL = optionalEnvVar("NEXT_PUBLIC_SITE_URL");
const MINIAPP_ORIGIN = optionalEnvVar("MINIAPP_ORIGIN");
const CACHE_TTL_SECONDS = optionalEnvVar("CACHE_TTL_SECONDS");
const DYNAMIC_API_CACHE_TTL_SECONDS = optionalEnvVar(
  "DYNAMIC_API_CACHE_TTL_SECONDS",
);
const DIRECT_DYNAMIC_REST_CACHE_TTL_SECONDS = optionalEnvVar(
  "DYNAMIC_REST_CACHE_TTL_SECONDS",
);

const placeholders: string[] = [];

function assignPlaceholder(key: string, value: string) {
  process.env[key] = value;
  placeholders.push(`${key} → ${value}`);
}

if (!SUPABASE_URL) {
  assignPlaceholder("SUPABASE_URL", "https://stub.supabase.co");
}
if (!SUPABASE_ANON_KEY) {
  assignPlaceholder("SUPABASE_ANON_KEY", "stub-anon-key");
}
const fallbackOrigin = "http://localhost:3000";

const canonicalSiteUrl = SITE_URL ?? fallbackOrigin;

if (!SITE_URL) {
  assignPlaceholder("SITE_URL", canonicalSiteUrl);
}

const publicSiteUrl = NEXT_PUBLIC_SITE_URL ?? canonicalSiteUrl;

if (!NEXT_PUBLIC_SITE_URL) {
  assignPlaceholder("NEXT_PUBLIC_SITE_URL", publicSiteUrl);
}

const resolvedMiniappOrigin = MINIAPP_ORIGIN ?? canonicalSiteUrl;

if (!MINIAPP_ORIGIN) {
  assignPlaceholder("MINIAPP_ORIGIN", resolvedMiniappOrigin);
}

const resolvedDynamicApiCacheTtl = DYNAMIC_API_CACHE_TTL_SECONDS ??
  DEFAULT_DYNAMIC_API_CACHE_TTL_SECONDS;

if (DYNAMIC_API_CACHE_TTL_SECONDS === undefined) {
  assignPlaceholder(
    "DYNAMIC_API_CACHE_TTL_SECONDS",
    resolvedDynamicApiCacheTtl,
  );
}

const resolvedDynamicRestCacheTtl = DIRECT_DYNAMIC_REST_CACHE_TTL_SECONDS ??
  CACHE_TTL_SECONDS ??
  DEFAULT_DYNAMIC_REST_CACHE_TTL_SECONDS;

if (DIRECT_DYNAMIC_REST_CACHE_TTL_SECONDS === undefined) {
  assignPlaceholder(
    "DYNAMIC_REST_CACHE_TTL_SECONDS",
    resolvedDynamicRestCacheTtl,
  );
}

if (placeholders.length > 0) {
  warn(
    "Some environment variables were missing. Friendly placeholders were added so the Codex CLI keeps humming.",
    { details: placeholders },
  );
} else {
  success("All required environment variables are already set. 🌟");
}

info(`MINIAPP_ORIGIN is set to ${resolvedMiniappOrigin}.`);

celebrate("Codex CLI environment bootstrap complete. Happy building!");
