import { fileURLToPath } from 'url';
import path from 'path';
import nextPWA from 'next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only enable Sentry when explicitly requested to avoid build-time issues
let withSentry = (config) => config;
if (process.env.ENABLE_SENTRY === 'true') {
  try {
    const { withSentryConfig } = await import('@sentry/nextjs');
    withSentry = withSentryConfig;
  } catch {
    console.warn('@sentry/nextjs not installed; skipping Sentry configuration');
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://stub.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "stub-anon-key";

function coerceSiteUrl(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    return new URL(candidate).origin;
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
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined,
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
  SITE_URL = "http://localhost:3000";
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "SITE_URL is not configured; defaulting to http://localhost:3000. Set SITE_URL or NEXT_PUBLIC_SITE_URL to your canonical domain.",
    );
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

const ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS || SITE_URL;

const CANONICAL_HOST = new URL(SITE_URL).hostname;

process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.SITE_URL = SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
process.env.ALLOWED_ORIGINS = ALLOWED_ORIGINS;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    SITE_URL,
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    ALLOWED_ORIGINS,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.cache = {
      type: 'filesystem',
      cacheDirectory: path.join(__dirname, '.next/cache/webpack'),
      buildDependencies: {
        config: [__filename],
      },
    };
    return config;
  },
};

if (nextConfig.output !== 'export') {
  nextConfig.redirects = async () => {
    if (process.env.DISABLE_HTTP_REDIRECTS === 'true') {
      return [];
    }
    return [
      {
        source: '/:path*',
        has: [
          { type: 'header', key: 'x-forwarded-proto', value: 'http' },
        ],
        destination: 'https://:host/:path*',
        permanent: true,
      },
      ...(process.env.LEGACY_HOST
        ? [
            {
              source: '/:path*',
              has: [{ type: 'host', value: process.env.LEGACY_HOST }],
              destination: `https://${CANONICAL_HOST}/:path*`,
              permanent: true,
            },
          ]
        : []),
    ];
  };
  nextConfig.headers = async () => [
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/:all*(js|css|svg|jpg|png|gif|ico|woff2?)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
      ],
    },
  ];
}

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  buildExcludes: [/.*\.map$/],
});
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

export default withBundleAnalyzer(
  withPWA(
    withSentry(nextConfig, {
      silent: true,
    }),
  ),
);

export const config = {
  matcher: ['/api/:path*'],
};
