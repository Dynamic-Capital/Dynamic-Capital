import { optionalEnvVar } from "@/utils/env";
import {
  TON_MANIFEST_ORIGIN_CANDIDATES,
  TON_MANIFEST_RESOURCE_PATH,
} from "../../../shared/ton/manifest";

export type TonNetwork = "mainnet" | "testnet";

export interface TonConfig {
  network: TonNetwork;
  manifestUrl: string;
  walletConnectProjectId?: string;
}

export type TonConnectManifest = {
  url: string;
  name: string;
  iconUrl: string;
};

const DEFAULT_NETWORK: TonNetwork = "mainnet";
export const TON_MANIFEST_PATH = "/api/tonconnect/manifest";
const MANIFEST_ICON_PATH = "/icon-mark.svg";
const PRIMARY_PRODUCTION_ORIGIN = TON_MANIFEST_ORIGIN_CANDIDATES[0];
const PROD_FALLBACK_ORIGINS = [...TON_MANIFEST_ORIGIN_CANDIDATES];
const DEFAULT_SERVER_FALLBACK_ORIGIN =
  PROD_FALLBACK_ORIGINS[PROD_FALLBACK_ORIGINS.length - 1];
const CONNECTIVITY_CHECK_TIMEOUT_MS = 2_500;
const PROD_MANIFEST_PATH = TON_MANIFEST_RESOURCE_PATH;
const DEV_FALLBACK_ORIGIN = "http://localhost:3000";
const APP_NAME = "Dynamic Capital";

const LOCALHOST_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

function coerceOrigin(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const hasScheme = trimmed.includes("://");
    const candidate = hasScheme ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    if (!hasScheme) {
      const hostname = url.hostname.toLowerCase();
      if (
        LOCALHOST_HOSTNAMES.has(hostname) ||
        hostname.endsWith(".localhost")
      ) {
        url.protocol = "http:";
      }
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveTonBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const candidates: Array<string | undefined> = [
    optionalEnvVar("NEXT_PUBLIC_SITE_URL", ["SITE_URL"]),
    optionalEnvVar("URL"),
    optionalEnvVar("APP_URL"),
    optionalEnvVar("PUBLIC_URL"),
    optionalEnvVar("DEPLOY_URL"),
    optionalEnvVar("DEPLOYMENT_URL"),
    optionalEnvVar("DIGITALOCEAN_APP_URL"),
    optionalEnvVar("DIGITALOCEAN_APP_SITE_DOMAIN"),
    (() => {
      const vercel = optionalEnvVar("VERCEL_URL");
      return vercel ? `https://${vercel}` : undefined;
    })(),
  ];

  for (const candidate of candidates) {
    const origin = coerceOrigin(candidate);
    if (origin) {
      return origin;
    }
  }

  const nodeEnv =
    typeof process !== "undefined" && typeof process.env?.NODE_ENV === "string"
      ? process.env.NODE_ENV
      : undefined;

  if (nodeEnv === "production") {
    return DEFAULT_SERVER_FALLBACK_ORIGIN;
  }

  return DEV_FALLBACK_ORIGIN;
}

function computeManifestUrl(origin: string): string {
  return new URL(PROD_MANIFEST_PATH, origin).toString();
}

let resolvedProdOrigin: string | null = typeof window !== "undefined"
  ? PRIMARY_PRODUCTION_ORIGIN
  : null;
let tonManifestUrlCache = computeManifestUrl(
  resolvedProdOrigin ?? DEFAULT_SERVER_FALLBACK_ORIGIN,
);
let connectivityCheckPromise: Promise<string> | null = null;

async function checkManifestConnectivity(origin: string): Promise<boolean> {
  if (typeof fetch !== "function") {
    return true;
  }

  const manifestUrl = computeManifestUrl(origin);
  const controller = typeof AbortController !== "undefined"
    ? new AbortController()
    : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), CONNECTIVITY_CHECK_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(manifestUrl, {
      method: "HEAD",
      signal: controller?.signal,
      cache: "no-store",
    });

    if (response.ok) {
      return true;
    }

    if (response.status === 405) {
      const fallbackResponse = await fetch(manifestUrl, {
        method: "GET",
        signal: controller?.signal,
        cache: "no-store",
      });

      return fallbackResponse.ok;
    }

    return false;
  } catch {
    return false;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function selectReachableProdOrigin(): Promise<string> {
  for (const origin of PROD_FALLBACK_ORIGINS) {
    const reachable = await checkManifestConnectivity(origin);
    if (reachable) {
      return origin;
    }
  }

  return DEFAULT_SERVER_FALLBACK_ORIGIN;
}

function ensureConnectivityCheck(): void {
  if (typeof window !== "undefined") {
    return;
  }

  if (connectivityCheckPromise) {
    return;
  }

  connectivityCheckPromise = selectReachableProdOrigin()
    .then((origin) => {
      resolvedProdOrigin = origin;
      updateManifestUrlCache(origin);
      return origin;
    })
    .catch((error) => {
      if (typeof console !== "undefined" && error instanceof Error) {
        console.warn(
          "Unable to verify TON manifest connectivity; using fallback origin",
          error.message,
        );
      }
      resolvedProdOrigin = DEFAULT_SERVER_FALLBACK_ORIGIN;
      updateManifestUrlCache(DEFAULT_SERVER_FALLBACK_ORIGIN);
      return DEFAULT_SERVER_FALLBACK_ORIGIN;
    });
}

export function resolveTonManifestUrl(baseUrl = resolveTonBaseUrl()): string {
  const manifestEnv = optionalEnvVar("NEXT_PUBLIC_TON_MANIFEST_URL", [
    "TON_MANIFEST_URL",
  ]);

  if (manifestEnv) {
    try {
      const hasScheme = manifestEnv.includes("://");
      const manifestUrl = hasScheme
        ? new URL(manifestEnv)
        : new URL(manifestEnv, baseUrl);
      return manifestUrl.toString();
    } catch {
      // Ignore malformed overrides and fall back to defaults below.
    }
  }

  try {
    const base = new URL(baseUrl);
    const hostname = base.hostname.toLowerCase();
    if (
      LOCALHOST_HOSTNAMES.has(hostname) ||
      hostname.endsWith(".localhost")
    ) {
      return new URL(TON_MANIFEST_PATH, base).toString();
    }
  } catch {
    // If the base URL can't be parsed, fall through to the production default.
  }

  ensureConnectivityCheck();

  return tonManifestUrlCache;
}

export function createTonManifest(
  baseUrl = resolveTonBaseUrl(),
): TonConnectManifest {
  return {
    url: baseUrl,
    name: APP_NAME,
    iconUrl: new URL(MANIFEST_ICON_PATH, baseUrl).toString(),
  };
}

const tonConfig: TonConfig = {
  network: DEFAULT_NETWORK,
  manifestUrl: tonManifestUrlCache,
};

function updateManifestUrlCache(origin: string): void {
  tonManifestUrlCache = computeManifestUrl(origin);
  tonConfig.manifestUrl = tonManifestUrlCache;
}

ensureConnectivityCheck();

export const TON_CONFIG: TonConfig = tonConfig;

export const TON_NETWORKS = {
  mainnet: {
    id: "mainnet",
    label: "TON Mainnet",
    apiEndpoint: "https://toncenter.com/api/v2/jsonRPC",
  },
  testnet: {
    id: "testnet",
    label: "TON Testnet",
    apiEndpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  },
} as const;
