export const PRODUCTION_ORIGIN = "https://dynamic-capital.ondigitalocean.app";

export const PRODUCTION_ALLOWED_ORIGIN_LIST = [
  "https://dynamic-capital.ondigitalocean.app",
  "https://dynamic-capital.vercel.app",
  "https://dynamic-capital.lovable.app",
];

export const PRODUCTION_ALLOWED_ORIGINS = PRODUCTION_ALLOWED_ORIGIN_LIST.join(
  ",",
);

/**
 * Resolve the most canonical origin for the current environment, preferring
 * explicit overrides before falling back to production defaults.
 */
export function resolveBrandingOrigin({
  env = process.env,
  fallbackOrigin = PRODUCTION_ORIGIN,
} = {}) {
  const snapshot = {
    LOVABLE_ORIGIN: env.LOVABLE_ORIGIN,
    SITE_URL: env.SITE_URL,
    NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL,
  };

  const originSource = snapshot.LOVABLE_ORIGIN
    ? "LOVABLE_ORIGIN"
    : snapshot.SITE_URL
    ? "SITE_URL"
    : snapshot.NEXT_PUBLIC_SITE_URL
    ? "NEXT_PUBLIC_SITE_URL"
    : "fallback";

  const resolvedOrigin = snapshot.LOVABLE_ORIGIN ||
    snapshot.SITE_URL ||
    snapshot.NEXT_PUBLIC_SITE_URL ||
    fallbackOrigin;

  return { originSource, resolvedOrigin };
}

/**
 * Ensure common branding environment variables are always populated so build
 * and dev tooling can rely on a consistent origin.
 */
export function applyBrandingEnvDefaults({
  env = process.env,
  fallbackOrigin = PRODUCTION_ORIGIN,
  allowedOrigins = () => PRODUCTION_ALLOWED_ORIGINS,
  includeSupabasePlaceholders = true,
} = {}) {
  const { originSource, resolvedOrigin } = resolveBrandingOrigin({
    env,
    fallbackOrigin,
  });

  const defaultedKeys = [];
  const recordDefault = (key, value) => {
    if (!value || env[key]) {
      return false;
    }

    env[key] = value;
    defaultedKeys.push(`${key} → ${value}`);
    return true;
  };

  recordDefault("SITE_URL", resolvedOrigin);
  recordDefault("NEXT_PUBLIC_SITE_URL", env.SITE_URL);
  recordDefault("MINIAPP_ORIGIN", env.SITE_URL);

  const allowedOriginsValue = typeof allowedOrigins === "function"
    ? allowedOrigins({ env, resolvedOrigin, fallbackOrigin })
    : allowedOrigins ?? resolvedOrigin;

  recordDefault("ALLOWED_ORIGINS", allowedOriginsValue);

  let lovableOriginDefaulted = false;
  if (!env.LOVABLE_ORIGIN) {
    env.LOVABLE_ORIGIN = resolvedOrigin;
    lovableOriginDefaulted = true;
  }

  const supabaseFallbacks = [];
  if (includeSupabasePlaceholders) {
    if (!env.SUPABASE_URL) {
      env.SUPABASE_URL = "https://stub.supabase.co";
      supabaseFallbacks.push("SUPABASE_URL → https://stub.supabase.co");
    }

    if (!env.SUPABASE_ANON_KEY) {
      env.SUPABASE_ANON_KEY = "stub-anon-key";
      supabaseFallbacks.push("SUPABASE_ANON_KEY → stub-anon-key");
    }
  }

  return {
    allowedOrigins: env.ALLOWED_ORIGINS,
    defaultedKeys,
    lovableOriginDefaulted,
    originSource,
    resolvedOrigin,
    supabaseFallbacks,
  };
}
