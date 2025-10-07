export const PRODUCTION_ORIGIN = "https://dynamiccapital.ton";

export const DIGITALOCEAN_PRIMARY_ORIGIN =
  "https://dynamic-capital-qazf2.ondigitalocean.app";
export const DIGITALOCEAN_LEGACY_ORIGIN =
  "https://dynamic-capital.ondigitalocean.app";

export const PRODUCTION_ALLOWED_ORIGIN_LIST = [
  "https://dynamiccapital.ton",
  "https://www.dynamiccapital.ton",
  DIGITALOCEAN_PRIMARY_ORIGIN,
  DIGITALOCEAN_LEGACY_ORIGIN,
  "https://dynamic.capital",
  "https://dynamic-capital.vercel.app",
  "https://dynamic-capital.lovable.app",
];

export const PRODUCTION_ALLOWED_ORIGINS = PRODUCTION_ALLOWED_ORIGIN_LIST.join(
  ",",
);

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

export function isTruthyFlag(value) {
  if (value === undefined || value === null) {
    return false;
  }
  const normalised = String(value).trim().toLowerCase();
  if (!normalised) {
    return false;
  }
  return TRUTHY_VALUES.has(normalised);
}

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
  preferFallbackForEphemeralHosts = false,
} = {}) {
  const preferFallback = preferFallbackForEphemeralHosts ||
    isTruthyFlag(env.SYNCED_BUILD_ORIGIN) ||
    isTruthyFlag(env.BRANDING_ENFORCE_PRODUCTION);

  const candidateSources = [
    { source: "LOVABLE_ORIGIN", value: env.LOVABLE_ORIGIN, ephemeral: false },
    { source: "SITE_URL", value: env.SITE_URL, ephemeral: false },
    {
      source: "NEXT_PUBLIC_SITE_URL",
      value: env.NEXT_PUBLIC_SITE_URL,
      ephemeral: false,
    },
    { source: "URL", value: env.URL, ephemeral: false },
    { source: "APP_URL", value: env.APP_URL, ephemeral: false },
    { source: "PUBLIC_URL", value: env.PUBLIC_URL, ephemeral: false },
    { source: "DEPLOY_URL", value: env.DEPLOY_URL, ephemeral: false },
    {
      source: "DEPLOYMENT_URL",
      value: env.DEPLOYMENT_URL,
      ephemeral: false,
    },
    {
      source: "PRIMARY_HOST",
      value: hostToOrigin(env.PRIMARY_HOST),
      ephemeral: true,
    },
    {
      source: "DIGITALOCEAN_APP_URL",
      value: env.DIGITALOCEAN_APP_URL,
      ephemeral: true,
    },
    {
      source: "DIGITALOCEAN_APP_SITE_DOMAIN",
      value: hostToOrigin(env.DIGITALOCEAN_APP_SITE_DOMAIN),
      ephemeral: true,
    },
    {
      source: "DIGITALOCEAN_APP_DOMAIN",
      value: hostToOrigin(env.DIGITALOCEAN_APP_DOMAIN),
      ephemeral: true,
    },
    {
      source: "DIGITALOCEAN_PRIMARY_HOST",
      value: hostToOrigin(env.DIGITALOCEAN_PRIMARY_HOST),
      ephemeral: true,
    },
    {
      source: "VERCEL_URL",
      value: env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
      ephemeral: true,
    },
  ];

  const findFirstValidOrigin = (candidates) => {
    for (const candidate of candidates) {
      const normalized = coerceOrigin(candidate.value);
      if (normalized) {
        return { originSource: candidate.source, resolvedOrigin: normalized };
      }
    }
    return null;
  };

  if (preferFallback) {
    const stableCandidates = candidateSources.filter((item) => !item.ephemeral);
    const stableOrigin = findFirstValidOrigin(stableCandidates);
    if (stableOrigin) {
      return stableOrigin;
    }
    const normalizedFallback = coerceOrigin(fallbackOrigin) ??
      PRODUCTION_ORIGIN;
    return { originSource: "fallback", resolvedOrigin: normalizedFallback };
  }

  const resolvedCandidate = findFirstValidOrigin(candidateSources);
  if (resolvedCandidate) {
    return resolvedCandidate;
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
  preferFallbackForEphemeralHosts = false,
} = {}) {
  const preferFallback = preferFallbackForEphemeralHosts ||
    isTruthyFlag(env.SYNCED_BUILD_ORIGIN) ||
    isTruthyFlag(env.BRANDING_ENFORCE_PRODUCTION);

  const { originSource, resolvedOrigin } = resolveBrandingOrigin({
    env,
    fallbackOrigin,
    preferFallbackForEphemeralHosts: preferFallback,
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
    preferSyncedOrigin: preferFallback,
    resolvedOrigin,
    supabaseFallbacks,
  };
}
