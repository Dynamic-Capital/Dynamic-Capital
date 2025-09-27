import { getEnvVar } from "@/utils/env.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

const timeoutFromEnv = Number.parseInt(
  getEnvVar("DYNAMIC_AI_CHAT_TIMEOUT_MS", ["DYNAMIC_AI_TIMEOUT_MS"]) ?? "",
  10,
);

export const DYNAMIC_AI_CHAT_URL = getEnvVar("DYNAMIC_AI_CHAT_URL");
export const DYNAMIC_AI_CHAT_KEY = getEnvVar("DYNAMIC_AI_CHAT_KEY", [
  "DYNAMIC_AI_SERVICE_KEY",
]);
export const DYNAMIC_AI_CHAT_TIMEOUT_MS = Number.isFinite(timeoutFromEnv)
  ? Math.max(timeoutFromEnv, 1_000)
  : DEFAULT_TIMEOUT_MS;

export const isDynamicAiConfigured = Boolean(
  DYNAMIC_AI_CHAT_URL && DYNAMIC_AI_CHAT_KEY,
);
