import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPEN_WEBUI_PUBLIC_URL = process.env.NEXT_PUBLIC_OPEN_WEBUI_URL;
const OPEN_WEBUI_INTERNAL_URL =
  process.env.OPEN_WEBUI_INTERNAL_URL ?? OPEN_WEBUI_PUBLIC_URL;

function normaliseRewriteTarget(rawUrl) {
  if (!rawUrl) {
    return null;
  }
  try {
    const parsed = new URL(rawUrl);
    if (!/https?:/.test(parsed.protocol)) {
      console.warn(
        `[miniapp] Ignoring Open WebUI URL with unsupported protocol: ${rawUrl}`,
      );
      return null;
    }
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${pathname}`;
  } catch (error) {
    console.warn(
      `[miniapp] Failed to parse Open WebUI URL "${rawUrl}":`,
      error,
    );
    return null;
  }
}

const openWebUIRewriteTarget = normaliseRewriteTarget(OPEN_WEBUI_INTERNAL_URL);

if (
  OPEN_WEBUI_PUBLIC_URL &&
  OPEN_WEBUI_INTERNAL_URL &&
  OPEN_WEBUI_PUBLIC_URL !== OPEN_WEBUI_INTERNAL_URL
) {
  try {
    const publicOrigin = new URL(OPEN_WEBUI_PUBLIC_URL).origin;
    const internalOrigin = new URL(OPEN_WEBUI_INTERNAL_URL).origin;
    if (publicOrigin !== internalOrigin) {
      console.warn(
        "[miniapp] Public and internal Open WebUI hosts differ (",
        publicOrigin,
        "vs",
        internalOrigin,
        "). Requests will proxy to the internal origin.",
      );
    }
  } catch (error) {
    console.warn(
      "[miniapp] Unable to compare Open WebUI host configuration:",
      error,
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
    appDir: true,
  },
  async rewrites() {
    if (!openWebUIRewriteTarget) {
      return [];
    }
    return [
      {
        source: "/openwebui/:path*",
        destination: `${openWebUIRewriteTarget}/:path*`,
      },
    ];
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../../../shared"),
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      encoding: false,
    };
    return config;
  },
};

export default nextConfig;
