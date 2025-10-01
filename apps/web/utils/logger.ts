import { isProduction } from "@/config/node-env";

// Allow running in both Node and Deno environments
declare const Deno:
  | { env?: { get(name: string): string | undefined } }
  | undefined;

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    return Deno.env.get(name);
  }
  return undefined;
}

const defaultLevel = isProduction ? "info" : "debug";
type Level = "debug" | "info" | "warn" | "error";
const levelWeights: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = (getEnv("LOG_LEVEL") as Level | undefined) ?? defaultLevel;

function shouldLog(level: Level): boolean {
  return levelWeights[level] >= levelWeights[currentLevel];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog("debug")) console.debug(...args);
  },
  log: (...args: unknown[]) => {
    if (shouldLog("info")) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog("info")) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) console.error(...args);
  },
};

export default logger;
