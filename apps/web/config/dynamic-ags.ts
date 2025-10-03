import { getEnvVar } from "@/utils/env";

const DEFAULT_TIMEOUT_MS = 45_000;

const timeoutFromEnv = Number.parseInt(
  getEnvVar("DYNAMIC_AGS_TIMEOUT_MS", ["DYNAMIC_AGS_CHAT_TIMEOUT_MS"]) ?? "",
  10,
);

export const DYNAMIC_AGS_PLAYBOOK_URL = getEnvVar("DYNAMIC_AGS_PLAYBOOK_URL");
export const DYNAMIC_AGS_PLAYBOOK_KEY = getEnvVar(
  "DYNAMIC_AGS_PLAYBOOK_KEY",
  ["DYNAMIC_AGS_SERVICE_KEY"],
);

export const DYNAMIC_AGS_TIMEOUT_MS = Number.isFinite(timeoutFromEnv)
  ? Math.max(timeoutFromEnv, 1_000)
  : DEFAULT_TIMEOUT_MS;

export const isDynamicAgsConfigured = Boolean(
  DYNAMIC_AGS_PLAYBOOK_URL && DYNAMIC_AGS_PLAYBOOK_KEY,
);
