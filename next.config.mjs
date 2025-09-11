import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let withSentryConfig = (config) => config;
try {
  ({ withSentryConfig } = require('@sentry/nextjs'));
} catch {
  console.warn('@sentry/nextjs not installed; skipping Sentry configuration');
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
  output: 'export',
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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: path.join(__dirname, '.next/cache/webpack'),
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    config.module.rules.push({
      test: /supabase[\\/]functions[\\/].*[\\/]vendor[\\/]/,
      loader: path.join(__dirname, 'scripts/empty-loader.cjs'),
    });
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
    {
      source: '/:path*',
      has: [
        { type: 'host', value: 'urchin-app-macix.ondigitalocean.app' },
      ],
      destination: `https://${CANONICAL_HOST}/:path*`,
      permanent: true,
    },
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

export default withSentryConfig(nextConfig, {
  silent: true,
});

export const config = {
  matcher: ['/api/:path*'],
};
