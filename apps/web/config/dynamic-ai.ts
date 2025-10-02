import { getEnvVar } from "@/utils/env.ts";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TRANSCRIPTION_TIMEOUT_MS = 120_000;
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_TRANSCRIPTION_TEMPERATURE = 0;

const timeoutFromEnv = Number.parseInt(
  getEnvVar("DYNAMIC_AI_CHAT_TIMEOUT_MS", ["DYNAMIC_AI_TIMEOUT_MS"]) ?? "",
  10,
);

const transcriptionTimeoutFromEnv = Number.parseInt(
  getEnvVar("DYNAMIC_AI_VOICE_TO_TEXT_TIMEOUT_MS", [
    "DYNAMIC_AI_TRANSCRIPTION_TIMEOUT_MS",
  ]) ?? "",
  10,
);

const transcriptionTemperatureFromEnv = Number.parseFloat(
  getEnvVar("DYNAMIC_AI_VOICE_TO_TEXT_TEMPERATURE", [
    "DYNAMIC_AI_TRANSCRIPTION_TEMPERATURE",
  ]) ?? "",
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

export const DYNAMIC_AI_VOICE_TO_TEXT_URL = getEnvVar(
  "DYNAMIC_AI_VOICE_TO_TEXT_URL",
  ["DYNAMIC_AI_TRANSCRIPTION_URL"],
);

export const DYNAMIC_AI_VOICE_TO_TEXT_KEY = getEnvVar(
  "DYNAMIC_AI_VOICE_TO_TEXT_KEY",
  ["DYNAMIC_AI_TRANSCRIPTION_KEY", "DYNAMIC_AI_SERVICE_KEY"],
);

export const DYNAMIC_AI_VOICE_TO_TEXT_MODEL =
  getEnvVar("DYNAMIC_AI_VOICE_TO_TEXT_MODEL", [
    "DYNAMIC_AI_TRANSCRIPTION_MODEL",
  ]) ?? DEFAULT_TRANSCRIPTION_MODEL;

export const DYNAMIC_AI_VOICE_TO_TEXT_TEMPERATURE =
  Number.isFinite(transcriptionTemperatureFromEnv)
    ? transcriptionTemperatureFromEnv
    : DEFAULT_TRANSCRIPTION_TEMPERATURE;

export const DYNAMIC_AI_VOICE_TO_TEXT_TIMEOUT_MS =
  Number.isFinite(transcriptionTimeoutFromEnv)
    ? Math.max(transcriptionTimeoutFromEnv, 1_000)
    : DEFAULT_TRANSCRIPTION_TIMEOUT_MS;

export const isDynamicAiVoiceToTextConfigured = Boolean(
  DYNAMIC_AI_VOICE_TO_TEXT_URL && DYNAMIC_AI_VOICE_TO_TEXT_KEY,
);
