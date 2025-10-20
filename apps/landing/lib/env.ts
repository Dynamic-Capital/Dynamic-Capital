import process from "node:process";
import { z } from "zod";

type Mode = "throw" | "report";

type MissingMap = {
  public: string[];
  server: string[];
};

type ValidationResult = {
  success: boolean;
  missing: MissingMap;
};

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

const serverSchema = z.object({
  SITE_URL: z.string().url(),
});

export const envDefinition = {
  app: "landing",
  public: Object.keys(publicSchema.shape),
  server: Object.keys(serverSchema.shape),
};

function unique(values: (string | undefined)[]): string[] {
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

function validatePublicEnv(): MissingMap["public"] {
  const result = publicSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ?? undefined,
  });

  return result.success ? [] : extractMissing(result.error);
}

function validateServerEnv(): MissingMap["server"] {
  const resolvedSiteUrl = process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ?? undefined;
  const result = serverSchema.safeParse({
    SITE_URL: resolvedSiteUrl,
  });

  if (
    result.success && typeof resolvedSiteUrl === "string" &&
    process.env.SITE_URL === undefined
  ) {
    process.env.SITE_URL = resolvedSiteUrl;
  }

  return result.success ? [] : extractMissing(result.error);
}

export class LandingEnvError extends Error {
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

export function checkRuntimeEnv(mode: Mode = "throw"): ValidationResult {
  const missing: MissingMap = {
    public: validatePublicEnv(),
    server: validateServerEnv(),
  };

  const success = missing.public.length === 0 && missing.server.length === 0;

  if (!success && mode === "throw") {
    throw new LandingEnvError(missing);
  }

  return { success, missing };
}

const shouldThrow = process.env.DC_SKIP_RUNTIME_ENV_CHECK !== "true";
checkRuntimeEnv(shouldThrow ? "throw" : "report");
