import { TON_MAINNET_OPERATIONS_TREASURY } from "../../../../shared/ton/mainnet-addresses";

const DEFAULT_OPS_TREASURY_ADDRESS = TON_MAINNET_OPERATIONS_TREASURY;

const DEFAULT_DYNAMIC_TON_API_USER_ID = "3672406698";

const TWA_RETURN_URL_ENV_KEYS = [
  "NEXT_PUBLIC_TONCONNECT_TWA_RETURN_URL",
  "NEXT_PUBLIC_TWA_RETURN_URL",
  "NEXT_PUBLIC_MINIAPP_RETURN_URL",
];

const TONCONNECT_MANIFEST_URL_ENV_KEYS = [
  "NEXT_PUBLIC_TONCONNECT_MANIFEST_URL",
  "TONCONNECT_MANIFEST_URL",
  "NEXT_PUBLIC_TON_MANIFEST_URL",
  "TON_MANIFEST_URL",
];

const TONCONNECT_BRIDGE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_TONCONNECT_BRIDGE_URL",
  "TONCONNECT_BRIDGE_URL",
  "NEXT_PUBLIC_TON_BRIDGE_URL",
  "TON_BRIDGE_URL",
];

function normalizeEnvString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function pickFirstEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const normalized = normalizeEnvString(process.env[key]);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

export const OPS_TREASURY_ADDRESS =
  pickFirstEnv([
    "NEXT_PUBLIC_TON_OPS_TREASURY",
    "NEXT_PUBLIC_OPS_TREASURY",
    "NEXT_PUBLIC_TON_TREASURY",
  ]) ?? DEFAULT_OPS_TREASURY_ADDRESS;

export const DYNAMIC_TON_API_USER_ID =
  pickFirstEnv([
    "NEXT_PUBLIC_DYNAMIC_TON_API_USER_ID",
    "NEXT_PUBLIC_TON_API_USER_ID",
    "NEXT_PUBLIC_TON_API_ACCOUNT",
  ]) ?? DEFAULT_DYNAMIC_TON_API_USER_ID;

export const TONCONNECT_TWA_RETURN_URL = pickFirstEnv(
  TWA_RETURN_URL_ENV_KEYS,
);

/**
 * Optional override for the published TON Connect manifest URL.
 * Use to force the mini-app to present a specific manifest host when
 * deploying ephemeral or staging builds.
 */
export const TONCONNECT_MANIFEST_URL_OVERRIDE = pickFirstEnv(
  TONCONNECT_MANIFEST_URL_ENV_KEYS,
);

/**
 * Optional override for the preferred TON Connect bridge endpoint. When set,
 * supported wallets will prefer this bridge while retaining their native
 * injected/js bridge fallbacks.
 */
export const TONCONNECT_BRIDGE_URL_OVERRIDE = pickFirstEnv(
  TONCONNECT_BRIDGE_URL_ENV_KEYS,
);
