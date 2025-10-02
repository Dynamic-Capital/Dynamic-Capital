import { z } from "zod";
import { getEnvVar, optionalEnvVar } from "../utils/env.ts";
import { DEFAULT_ECONOMIC_CALENDAR_URL } from "@/config/economic-calendar";
import {
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
} from "@/config/supabase-runtime";

type Mode = "throw" | "report";

type MissingMap = {
  public: string[];
  server: string[];
};

type ValidationResult = {
  success: boolean;
  missing: MissingMap;
};

export const publicSchema = z.object({
  NEXT_PUBLIC_ENV: z.string().default("development"),
  NEXT_PUBLIC_COMMIT_SHA: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_MINI_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  NEXT_PUBLIC_ECONOMIC_CALENDAR_URL: z.string().url().optional(),
  NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY: z.string().optional(),
  NEXT_PUBLIC_WEB3_CHAINS: z.string().optional(),
  NEXT_PUBLIC_WEB3_APP_NAME: z.string().optional(),
  NEXT_PUBLIC_WEB3_APP_DESCRIPTION: z.string().optional(),
  NEXT_PUBLIC_WEB3_APP_ICON: z.string().optional(),
  NEXT_PUBLIC_WEB3_RECOMMENDED_WALLETS: z.string().optional(),
  NEXT_PUBLIC_LAYERZERO_ENV: z.string().optional(),
  NEXT_PUBLIC_LAYERZERO_ENDPOINTS: z.string().optional(),
});

export const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default(
    "development",
  ),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE: z.string().min(10),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  SITE_URL: z.string().url().optional(),
  ROUTE_GUARD_PASSWORD: z.string().min(1),
});

export const envDefinition = {
  app: "web",
  public: Object.keys(publicSchema.shape),
  server: Object.keys(serverSchema.shape),
};

function unique(values: (string | number | symbol | undefined)[]): string[] {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string"),
    ),
  ).sort();
}

function extractMissing(error: z.ZodError): string[] {
  return unique(
    error.issues
      .filter((issue) =>
        issue.code === "invalid_type" || issue.code === "too_small" ||
        issue.code === "custom"
      )
      .map((issue) => issue.path?.[0])
      .filter((key): key is string => typeof key === "string"),
  );
}

function validatePublicEnv(): ValidationResult {
  const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL", ["SUPABASE_URL"]);
  const supabaseAnonKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", [
    "SUPABASE_ANON_KEY",
    "SUPABASE_KEY",
  ]);

  const raw = {
    NEXT_PUBLIC_ENV: optionalEnvVar("NEXT_PUBLIC_ENV"),
    NEXT_PUBLIC_COMMIT_SHA: optionalEnvVar(
      "NEXT_PUBLIC_COMMIT_SHA",
      ["COMMIT_SHA"],
    ),
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ?? DEFAULT_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ?? DEFAULT_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: optionalEnvVar("NEXT_PUBLIC_API_URL", ["API_URL"]),
    NEXT_PUBLIC_SENTRY_DSN: optionalEnvVar("NEXT_PUBLIC_SENTRY_DSN", [
      "SENTRY_DSN",
    ]),
    NEXT_PUBLIC_SITE_URL: optionalEnvVar("NEXT_PUBLIC_SITE_URL", ["SITE_URL"]),
    NEXT_PUBLIC_MINI_APP_URL: optionalEnvVar(
      "NEXT_PUBLIC_MINI_APP_URL",
      ["MINI_APP_URL"],
    ),
    NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET: optionalEnvVar(
      "NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET",
      ["TELEGRAM_WEBHOOK_SECRET"],
    ),
    NEXT_PUBLIC_POSTHOG_KEY: optionalEnvVar("NEXT_PUBLIC_POSTHOG_KEY"),
    NEXT_PUBLIC_POSTHOG_HOST: optionalEnvVar("NEXT_PUBLIC_POSTHOG_HOST"),
    NEXT_PUBLIC_ECONOMIC_CALENDAR_URL: optionalEnvVar(
      "NEXT_PUBLIC_ECONOMIC_CALENDAR_URL",
      ["ECONOMIC_CALENDAR_URL"],
    ) ?? DEFAULT_ECONOMIC_CALENDAR_URL,
    NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY: optionalEnvVar(
      "NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY",
      ["ECONOMIC_CALENDAR_API_KEY"],
    ),
    NEXT_PUBLIC_WEB3_CHAINS: optionalEnvVar("NEXT_PUBLIC_WEB3_CHAINS"),
    NEXT_PUBLIC_WEB3_APP_NAME: optionalEnvVar("NEXT_PUBLIC_WEB3_APP_NAME"),
    NEXT_PUBLIC_WEB3_APP_DESCRIPTION: optionalEnvVar(
      "NEXT_PUBLIC_WEB3_APP_DESCRIPTION",
    ),
    NEXT_PUBLIC_WEB3_APP_ICON: optionalEnvVar("NEXT_PUBLIC_WEB3_APP_ICON"),
    NEXT_PUBLIC_WEB3_RECOMMENDED_WALLETS: optionalEnvVar(
      "NEXT_PUBLIC_WEB3_RECOMMENDED_WALLETS",
    ),
    NEXT_PUBLIC_LAYERZERO_ENV: optionalEnvVar("NEXT_PUBLIC_LAYERZERO_ENV"),
    NEXT_PUBLIC_LAYERZERO_ENDPOINTS: optionalEnvVar(
      "NEXT_PUBLIC_LAYERZERO_ENDPOINTS",
    ),
  } satisfies Record<string, string | undefined>;

  const result = publicSchema.safeParse(raw);
  if (result.success) {
    const missing: string[] = [];
    if (!supabaseUrl) {
      missing.push("NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!supabaseAnonKey) {
      missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return { success: true, missing: { public: missing, server: [] } };
  }

  return {
    success: false,
    missing: {
      public: extractMissing(result.error),
      server: [],
    },
  };
}

function validateServerEnv(): ValidationResult {
  const raw = {
    NODE_ENV: optionalEnvVar("NODE_ENV"),
    SUPABASE_URL: getEnvVar("SUPABASE_URL", ["NEXT_PUBLIC_SUPABASE_URL"]),
    SUPABASE_ANON_KEY: getEnvVar("SUPABASE_ANON_KEY", [
      "SUPABASE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]),
    SUPABASE_SERVICE_ROLE_KEY: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", [
      "SUPABASE_SERVICE_ROLE",
    ]),
    SUPABASE_SERVICE_ROLE: getEnvVar("SUPABASE_SERVICE_ROLE", [
      "SUPABASE_SERVICE_ROLE_KEY",
    ]),
    SENTRY_DSN: optionalEnvVar("SENTRY_DSN", ["NEXT_PUBLIC_SENTRY_DSN"]),
    LOG_LEVEL: optionalEnvVar("LOG_LEVEL"),
    SITE_URL: optionalEnvVar("SITE_URL", ["NEXT_PUBLIC_SITE_URL"]),
    ROUTE_GUARD_PASSWORD: getEnvVar("ROUTE_GUARD_PASSWORD"),
  } satisfies Record<string, string | undefined>;

  const result = serverSchema.safeParse(raw);
  if (result.success) {
    return { success: true, missing: { public: [], server: [] } };
  }

  return {
    success: false,
    missing: { public: [], server: extractMissing(result.error) },
  };
}

export class WebEnvError extends Error {
  constructor(public missing: MissingMap) {
    const missingPublic = missing.public.length
      ? `public → ${missing.public.join(", ")}`
      : undefined;
    const missingServer = missing.server.length
      ? `server → ${missing.server.join(", ")}`
      : undefined;
    const details = [missingPublic, missingServer].filter(Boolean).join("; ");
    super(
      details
        ? `Missing required environment variables: ${details}`
        : "Missing required environment variables",
    );
  }
}

const OPTIONAL_SERVER_WARN_KEY = "__dc_optional_server_env_warned__";

const globalScope = globalThis as
  | { [OPTIONAL_SERVER_WARN_KEY]?: boolean }
  | Record<string, unknown>;

let hasWarnedOptionalServerEnv = false;

export function checkRuntimeEnv(mode: Mode = "throw"): ValidationResult {
  const publicResult = validatePublicEnv();
  const serverResult = validateServerEnv();

  const merged: MissingMap = {
    public: unique([...publicResult.missing.public]),
    server: unique([...serverResult.missing.server]),
  };

  const toleratedServerMissing = new Set<keyof typeof serverSchema.shape>([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE",
  ]);
  const toleratedPublicMissing = new Set<keyof typeof publicSchema.shape>([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);

  const optionalServerMissing = merged.server.filter((key) =>
    toleratedServerMissing.has(key as keyof typeof serverSchema.shape)
  );

  const fatalMissing: MissingMap = {
    public: merged.public.filter(
      (key) =>
        !toleratedPublicMissing.has(key as keyof typeof publicSchema.shape),
    ),
    server: merged.server.filter(
      (key) =>
        !toleratedServerMissing.has(key as keyof typeof serverSchema.shape),
    ),
  };

  const success = fatalMissing.public.length === 0 &&
    fatalMissing.server.length === 0;

  if (!success && mode === "throw") {
    throw new WebEnvError(fatalMissing);
  }

  const globalWarned = Boolean(globalScope?.[OPTIONAL_SERVER_WARN_KEY]);

  if (
    optionalServerMissing.length > 0 && !hasWarnedOptionalServerEnv &&
    !globalWarned
  ) {
    const formatted = optionalServerMissing.join(", ");
    const message =
      `Missing optional server environment variables: ${formatted}. ` +
      "Supabase service features will be disabled until they are provided.";
    if (process.env.NODE_ENV !== "production") {
      if (mode === "throw") {
        console.warn(message);
      } else {
        console.info(message);
      }
    }
    hasWarnedOptionalServerEnv = true;
    if (globalScope && typeof globalScope === "object") {
      globalScope[OPTIONAL_SERVER_WARN_KEY] = true;
    }
  }

  return { success, missing: merged };
}

const shouldThrow = process.env.DC_SKIP_RUNTIME_ENV_CHECK !== "true";
const validation = checkRuntimeEnv(shouldThrow ? "throw" : "report");

export const runtimeEnv = validation;
