import { optionalEnvVar } from "@/utils/env";

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
const DIGITALOCEAN_PRIMARY_ORIGIN =
  "https://dynamic-capital-qazf2.ondigitalocean.app";
const DIGITALOCEAN_LEGACY_ORIGIN = "https://dynamic-capital.ondigitalocean.app";
const PROD_FALLBACK_ORIGINS = [
  DIGITALOCEAN_PRIMARY_ORIGIN,
  DIGITALOCEAN_LEGACY_ORIGIN,
];
const PROD_FALLBACK_ORIGIN = PROD_FALLBACK_ORIGINS[0];
const PROD_MANIFEST_URL = new URL(
  "/tonconnect-manifest.json",
  PROD_FALLBACK_ORIGIN,
).toString();
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
    return PROD_FALLBACK_ORIGIN;
  }

  return DEV_FALLBACK_ORIGIN;
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

  return PROD_MANIFEST_URL;
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

const TON_MANIFEST_URL = resolveTonManifestUrl();

export const TON_CONFIG: TonConfig = Object.freeze({
  network: DEFAULT_NETWORK,
  manifestUrl: TON_MANIFEST_URL,
});

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
