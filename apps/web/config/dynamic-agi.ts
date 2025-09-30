import { getEnvVar } from "@/utils/env";

const DEFAULT_TIMEOUT_MS = 45_000;

const timeoutFromEnv = Number.parseInt(
  getEnvVar("DYNAMIC_AGI_CHAT_TIMEOUT_MS") ?? "",
  10,
);

export const DYNAMIC_AGI_CHAT_URL = getEnvVar("DYNAMIC_AGI_CHAT_URL");
export const DYNAMIC_AGI_CHAT_KEY = getEnvVar("DYNAMIC_AGI_CHAT_KEY", [
  "DYNAMIC_AGI_SERVICE_KEY",
]);
export const DYNAMIC_AGI_CHAT_TIMEOUT_MS = Number.isFinite(timeoutFromEnv)
  ? Math.max(timeoutFromEnv, 1_000)
  : DEFAULT_TIMEOUT_MS;

export const isDynamicAgiConfigured = Boolean(
  DYNAMIC_AGI_CHAT_URL && DYNAMIC_AGI_CHAT_KEY,
);
