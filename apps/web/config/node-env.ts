/**
 * Shared helper for determining the current runtime environment.
 * Supports both Node (process.env) and Deno (Deno.env) execution contexts.
 */

declare const process:
  | { env?: Record<string, string | undefined> }
  | undefined;
declare const Deno:
  | { env?: { get(name: string): string | undefined } }
  | undefined;

type NodeEnv = "development" | "test" | "production";

function sanitize(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "undefined" || lower === "null") {
    return undefined;
  }
  return trimmed;
}

function readEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process?.env) {
    const value = process.env[name];
    if (typeof value === "string") return value;
  }
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    try {
      const value = Deno.env.get(name);
      if (typeof value === "string") return value;
    } catch {
      // Access to Deno.env may be restricted in some contexts; ignore.
    }
  }
  return undefined;
}

function resolveNodeEnv(): NodeEnv {
  const raw = sanitize(readEnv("NODE_ENV"))?.toLowerCase();
  switch (raw) {
    case "production":
      return "production";
    case "test":
      return "test";
    default:
      return "development";
  }
}

export const NODE_ENV: NodeEnv = resolveNodeEnv();
export const isProduction = NODE_ENV === "production";
export const isDevelopment = NODE_ENV === "development";
export const isTest = NODE_ENV === "test";

export type { NodeEnv };
