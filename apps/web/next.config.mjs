import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import nextPWA from 'next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only enable Sentry when explicitly requested to avoid build-time issues
let withSentry = (config) => config;
if (process.env.ENABLE_SENTRY === 'true') {
  try {
    ({ withSentryConfig: withSentry } = require('@sentry/nextjs'));
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

if (
  process.env.NODE_ENV === "production" &&
  !process.env.SITE_URL &&
  !process.env.NEXT_PUBLIC_SITE_URL
) {
  throw new Error("SITE_URL environment variable is required in production");
}

const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:8080";

const CANONICAL_HOST = new URL(SITE_URL).hostname;

process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
process.env.SITE_URL = SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;

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
  nextConfig.redirects = async () => [
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
