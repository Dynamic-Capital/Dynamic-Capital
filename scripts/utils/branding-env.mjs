export const PRODUCTION_ORIGIN = "https://dynamiccapital.ton";

import {
  PRODUCTION_ALLOWED_ORIGINS as BASE_PRODUCTION_ALLOWED_ORIGINS,
  PRODUCTION_ALLOWED_ORIGINS_STRING,
  TON_SITE_ORIGIN,
} from "./allowed-origins.mjs";

export const PRODUCTION_ALLOWED_ORIGIN_LIST = Object.freeze([
  ...BASE_PRODUCTION_ALLOWED_ORIGINS,
]);

export const PRODUCTION_ALLOWED_ORIGINS = PRODUCTION_ALLOWED_ORIGINS_STRING;

export { TON_SITE_ORIGIN };

function coerceOrigin(input) {
  if (!input) {
    return undefined;
  }
  const text = `${input}`.trim();
  if (!text) {
    return undefined;
  }

  try {
    const candidate = text.includes("://") ? text : `https://${text}`;
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

function hostToOrigin(host) {
  if (!host) {
    return undefined;
  }
  const text = `${host}`.trim();
  if (!text) {
    return undefined;
  }
  return coerceOrigin(text);
}

/**
 * Resolve the most canonical origin for the current environment, preferring
 * explicit overrides before falling back to production defaults.
 */
export function resolveBrandingOrigin({
  env = process.env,
  fallbackOrigin = PRODUCTION_ORIGIN,
} = {}) {
  const candidates = [
    ["LOVABLE_ORIGIN", env.LOVABLE_ORIGIN],
    ["SITE_URL", env.SITE_URL],
    ["NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL],
    ["URL", env.URL],
    ["APP_URL", env.APP_URL],
    ["PUBLIC_URL", env.PUBLIC_URL],
    ["DEPLOY_URL", env.DEPLOY_URL],
    ["DEPLOYMENT_URL", env.DEPLOYMENT_URL],
    ["PRIMARY_HOST", hostToOrigin(env.PRIMARY_HOST)],
    ["DIGITALOCEAN_APP_URL", env.DIGITALOCEAN_APP_URL],
    [
      "DIGITALOCEAN_APP_SITE_DOMAIN",
      hostToOrigin(env.DIGITALOCEAN_APP_SITE_DOMAIN),
    ],
    [
      "DIGITALOCEAN_APP_DOMAIN",
      hostToOrigin(env.DIGITALOCEAN_APP_DOMAIN),
    ],
    [
      "DIGITALOCEAN_PRIMARY_HOST",
      hostToOrigin(env.DIGITALOCEAN_PRIMARY_HOST),
    ],
    ["VERCEL_URL", env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined],
  ];

  for (const [source, rawValue] of candidates) {
    const normalized = coerceOrigin(rawValue);
    if (normalized) {
      return { originSource: source, resolvedOrigin: normalized };
    }
  }

  const normalizedFallback = coerceOrigin(fallbackOrigin) ?? PRODUCTION_ORIGIN;
  return { originSource: "fallback", resolvedOrigin: normalizedFallback };
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
