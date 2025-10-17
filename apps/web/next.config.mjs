import { fileURLToPath } from "url";
import path from "path";
import nextPWA from "next-pwa";
import bundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "@next/mdx";
import runtimeCaching from "./config/pwa-runtime-caching.mjs";
import commitEnvKeys from "./config/commit-env-keys.json" with { type: "json" };
import localeConfig from "./config/locales.json" with { type: "json" };
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only enable Sentry when explicitly requested to avoid build-time issues
let withSentry = (config) => config;
if (process.env.ENABLE_SENTRY === "true") {
  try {
    const { withSentryConfig } = await import("@sentry/nextjs");
    withSentry = withSentryConfig;
  } catch {
    console.warn("@sentry/nextjs not installed; skipping Sentry configuration");
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://stub.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "stub-anon-key";

const DYNAMIC_CAPITAL_TON_HOST = "dynamiccapital.ton";
const DYNAMIC_CAPITAL_TON_ORIGIN = `https://${DYNAMIC_CAPITAL_TON_HOST}`;
const DYNAMIC_CAPITAL_TON_WWW_ORIGIN =
  `https://www.${DYNAMIC_CAPITAL_TON_HOST}`;
const TON_GATEWAY_PRIMARY_HOST = "ton.site";
const TON_GATEWAY_PRIMARY_ORIGIN = `https://${TON_GATEWAY_PRIMARY_HOST}`;
const TON_GATEWAY_STANDBY_HOST =
  "ton-gateway.dynamic-capital.ondigitalocean.app";
const TON_GATEWAY_STANDBY_ORIGIN = `https://${TON_GATEWAY_STANDBY_HOST}`;
const TON_GATEWAY_LEGACY_ORIGIN =
  "https://ton-gateway.dynamic-capital.lovable.app";

const DEFAULT_COMMIT_ENV_KEYS = [
  "NEXT_PUBLIC_COMMIT_SHA",
  "COMMIT_SHA",
  "GIT_COMMIT_SHA",
  "GIT_COMMIT",
  "VERCEL_GIT_COMMIT_SHA",
  "SOURCE_VERSION",
  "DIGITALOCEAN_GIT_COMMIT_SHA",
  "DIGITALOCEAN_DEPLOYMENT_ID",
  "DIGITALOCEAN_APP_DEPLOYMENT_SHA",
  "RENDER_GIT_COMMIT",
  "HEROKU_SLUG_COMMIT",
];

const COMMIT_ENV_KEYS = Array.isArray(commitEnvKeys) && commitEnvKeys.length > 0
  ? commitEnvKeys
  : DEFAULT_COMMIT_ENV_KEYS;

function coerceCommit(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  if (trimmed === "undefined" || trimmed === "null") return undefined;
  return trimmed;
}

let COMMIT_SHA = "dev";
for (const key of COMMIT_ENV_KEYS) {
  const candidate = coerceCommit(process.env[key]);
  if (candidate) {
    COMMIT_SHA = candidate;
    if (!process.env.COMMIT_SHA) {
      process.env.COMMIT_SHA = candidate;
    }
    break;
  }
}

if (!process.env.COMMIT_SHA) {
  process.env.COMMIT_SHA = COMMIT_SHA;
}

if (!process.env.NEXT_PUBLIC_COMMIT_SHA) {
  process.env.NEXT_PUBLIC_COMMIT_SHA = COMMIT_SHA;
}

function coerceSiteUrl(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

function coerceHost(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(candidate).hostname;
  } catch {
    return undefined;
  }
}

const siteUrlSources = [
  ["SITE_URL", process.env.SITE_URL],
  ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL],
  ["URL", process.env.URL],
  ["APP_URL", process.env.APP_URL],
  ["PUBLIC_URL", process.env.PUBLIC_URL],
  ["DEPLOY_URL", process.env.DEPLOY_URL],
  ["DEPLOYMENT_URL", process.env.DEPLOYMENT_URL],
  ["DIGITALOCEAN_APP_URL", process.env.DIGITALOCEAN_APP_URL],
  [
    "DIGITALOCEAN_APP_SITE_DOMAIN",
    process.env.DIGITALOCEAN_APP_SITE_DOMAIN,
  ],
  [
    "VERCEL_URL",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ],
];

let SITE_URL = undefined;
let siteUrlSource = undefined;
for (const [source, value] of siteUrlSources) {
  const normalized = coerceSiteUrl(value);
  if (normalized) {
    SITE_URL = normalized;
    siteUrlSource = source;
    break;
  }
}

if (!SITE_URL) {
  if (process.env.NODE_ENV === "production") {
    SITE_URL = DYNAMIC_CAPITAL_TON_ORIGIN;
    console.warn(
      `SITE_URL is not configured; defaulting to ${DYNAMIC_CAPITAL_TON_ORIGIN}. Set SITE_URL or NEXT_PUBLIC_SITE_URL to your canonical domain.`,
    );
  } else {
    SITE_URL = "http://localhost:3000";
  }
} else if (
  process.env.NODE_ENV === "production" &&
  siteUrlSource &&
  !["SITE_URL", "NEXT_PUBLIC_SITE_URL"].includes(siteUrlSource)
) {
  console.warn(
    `SITE_URL not provided. Using ${siteUrlSource} to derive ${SITE_URL}. Set SITE_URL to avoid fallback behaviour.`,
  );
}

const canonicalHostSources = [
  ["PRIMARY_HOST", process.env.PRIMARY_HOST],
  ["DIGITALOCEAN_APP_SITE_DOMAIN", process.env.DIGITALOCEAN_APP_SITE_DOMAIN],
  ["DIGITALOCEAN_APP_URL", process.env.DIGITALOCEAN_APP_URL],
];

let CANONICAL_HOST = undefined;
let canonicalHostSource = undefined;
for (const [source, value] of canonicalHostSources) {
  const normalized = coerceHost(value);
  if (normalized) {
    CANONICAL_HOST = normalized;
    canonicalHostSource = source;
    break;
  }
}

if (!CANONICAL_HOST) {
  CANONICAL_HOST = new URL(SITE_URL).hostname;
  canonicalHostSource = canonicalHostSource ?? "SITE_URL";
} else {
  const siteUrlHost = new URL(SITE_URL).hostname;
  if (siteUrlHost !== CANONICAL_HOST) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `Overriding SITE_URL host ${siteUrlHost} with ${CANONICAL_HOST} derived from ${canonicalHostSource}.`,
      );
    }
    SITE_URL = `https://${CANONICAL_HOST}`;
  }
}

const defaultAllowedOrigins = new Set([SITE_URL]);
if (process.env.NODE_ENV === "production") {
  defaultAllowedOrigins.add(DYNAMIC_CAPITAL_TON_ORIGIN);
  defaultAllowedOrigins.add(DYNAMIC_CAPITAL_TON_WWW_ORIGIN);
  defaultAllowedOrigins.add(TON_GATEWAY_PRIMARY_ORIGIN);
  defaultAllowedOrigins.add(TON_GATEWAY_STANDBY_ORIGIN);
  defaultAllowedOrigins.add(TON_GATEWAY_LEGACY_ORIGIN);
}
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ||
  Array.from(defaultAllowedOrigins).join(",");

function normalizeLocale(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

const configuredLocales = Array.isArray(localeConfig?.locales)
  ? localeConfig.locales
    .map((locale) => normalizeLocale(locale))
    .filter((locale) => Boolean(locale))
  : [];

const FALLBACK_LOCALE = "en";
const LOCALES = configuredLocales.length > 0
  ? configuredLocales
  : [FALLBACK_LOCALE];

const configuredDefaultLocale = normalizeLocale(localeConfig?.defaultLocale);
const DEFAULT_LOCALE =
  configuredDefaultLocale && LOCALES.includes(configuredDefaultLocale)
    ? configuredDefaultLocale
    : LOCALES[0];

process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.SITE_URL = SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
process.env.ALLOWED_ORIGINS = ALLOWED_ORIGINS;
process.env.DEFAULT_LOCALE = DEFAULT_LOCALE;
process.env.NEXT_PUBLIC_DEFAULT_LOCALE = DEFAULT_LOCALE;

// Disable Lucide import modularisation because the upstream package renamed icon
// files to kebab-case (for example `chart-pie.js`).
//
// Next.js' `optimizePackageImports` + `modularizeImports` previously attempted to
// rewrite `import { PieChart } from "lucide-react"` into
// `import PieChart from "lucide-react/dist/esm/icons/PieChart"`, which no longer
// exists. The build would then fail with "Module not found" errors for several
// icons at runtime (visible in production and when running `next dev`).
//
// Until Next.js exposes a kebab-case helper (or lucide-react restores
// pascal-case filenames), we fall back to the default lucide entrypoint. This
// keeps the app functional even though it forgoes the micro-optimised import
// splitting.
const optimizePackageImports = [];

const modularizeImportRules = {};

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: {
    optimizePackageImports,
  },
  modularizeImports: modularizeImportRules,
  env: {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    COMMIT_SHA,
    NEXT_PUBLIC_COMMIT_SHA: COMMIT_SHA,
    SITE_URL,
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    ALLOWED_ORIGINS,
    DEFAULT_LOCALE,
    NEXT_PUBLIC_DEFAULT_LOCALE: DEFAULT_LOCALE,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  transpilePackages: ["lucide-react"],
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    config.cache = {
      type: "filesystem",
      cacheDirectory: path.join(__dirname, ".next/cache/webpack"),
      buildDependencies: {
        config: [__filename],
      },
    };
    return config;
  },
};

if (nextConfig.output !== "export") {
  nextConfig.redirects = async () => {
    if (process.env.DISABLE_HTTP_REDIRECTS === "true") {
      return [];
    }
    const httpProtoHeader = {
      type: "header",
      key: "x-forwarded-proto",
      value: "http",
    };
    return [
      {
        source: "/",
        has: [httpProtoHeader],
        destination: `https://${CANONICAL_HOST}`,
        permanent: true,
      },
      {
        source: "/:path((?!healthz$).+)",
        has: [httpProtoHeader],
        destination: `https://${CANONICAL_HOST}/:path`,
        permanent: true,
      },
      ...(process.env.LEGACY_HOST
        ? [
          {
            source: "/:path*",
            has: [{ type: "host", value: process.env.LEGACY_HOST }],
            destination: `https://${CANONICAL_HOST}/:path*`,
            permanent: true,
          },
        ]
        : []),
    ];
  };
  nextConfig.headers = async () => [
    {
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/:all*(js|css|svg|jpg|png|gif|ico|woff2?)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
      ],
    },
  ];
}

const withPWA = nextPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  scope: "/",
  fallbacks: {
    document: "/offline.html",
  },
  runtimeCaching,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  buildExcludes: [/.*\.map$/],
});
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const mdxEnhancedConfig = withMDX(nextConfig);

export default withBundleAnalyzer(
  withPWA(
    withSentry(mdxEnhancedConfig, {
      silent: true,
    }),
  ),
);

export const config = {
  matcher: ["/api/:path*"],
};
