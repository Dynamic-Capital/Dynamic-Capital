const DEFAULT_OPS_TREASURY_ADDRESS =
  "EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD";

const DEFAULT_DYNAMIC_TON_API_USER_ID = "3672406698";

const TWA_RETURN_URL_ENV_KEYS = [
  "NEXT_PUBLIC_TONCONNECT_TWA_RETURN_URL",
  "NEXT_PUBLIC_TWA_RETURN_URL",
  "NEXT_PUBLIC_MINIAPP_RETURN_URL",
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
