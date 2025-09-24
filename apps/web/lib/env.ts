import { z } from 'zod';
import { getEnvVar, optionalEnvVar } from '../utils/env.ts';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_ENV: z.string().min(1).default('development'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_COMMIT_SHA: z.string().min(7).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE: z.string().min(10).optional(),
  LOG_LEVEL: z.string().min(1).optional(),
  SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional()
});

export type Env = z.infer<typeof EnvSchema>;

function collectRuntimeEnv(): Partial<Env> {
  const rawNodeEnv = getEnvVar('NODE_ENV');
  const nodeEnv = rawNodeEnv === 'production' || rawNodeEnv === 'test' || rawNodeEnv === 'development'
    ? rawNodeEnv
    : 'development';

  return {
    NODE_ENV: nodeEnv,
    NEXT_PUBLIC_ENV: getEnvVar('NEXT_PUBLIC_ENV') ?? 'development',
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', ['SUPABASE_URL']),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', [
      'SUPABASE_ANON_KEY',
      'SUPABASE_KEY'
    ]),
    NEXT_PUBLIC_COMMIT_SHA: optionalEnvVar('NEXT_PUBLIC_COMMIT_SHA', [
      'COMMIT_SHA',
      'GIT_COMMIT_SHA',
      'VERCEL_GIT_COMMIT_SHA',
      'SOURCE_VERSION'
    ]) ?? undefined,
    NEXT_PUBLIC_SENTRY_DSN: optionalEnvVar('NEXT_PUBLIC_SENTRY_DSN', ['SENTRY_DSN']) ?? undefined,
    SENTRY_DSN: optionalEnvVar('SENTRY_DSN', ['NEXT_PUBLIC_SENTRY_DSN']) ?? undefined,
    NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET: optionalEnvVar('NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET') ?? undefined,
    NEXT_PUBLIC_POSTHOG_KEY: optionalEnvVar('NEXT_PUBLIC_POSTHOG_KEY') ?? undefined,
    NEXT_PUBLIC_POSTHOG_HOST: optionalEnvVar('NEXT_PUBLIC_POSTHOG_HOST') ?? undefined,
    SUPABASE_SERVICE_ROLE: optionalEnvVar('SUPABASE_SERVICE_ROLE', ['SUPABASE_SERVICE_ROLE_KEY']) ?? undefined,
    LOG_LEVEL: optionalEnvVar('LOG_LEVEL') ?? undefined,
    SITE_URL: optionalEnvVar('SITE_URL', ['APP_URL', 'PUBLIC_URL', 'URL']) ?? undefined,
    NEXT_PUBLIC_SITE_URL: optionalEnvVar('NEXT_PUBLIC_SITE_URL', ['SITE_URL']) ?? undefined
  } satisfies Partial<Env>;
}

let cachedEnv: Env | null = null;
let cachedError: z.ZodError<Env> | null = null;

function formatIssues(error: z.ZodError<Env>): string {
  const names = new Set<string>();
  for (const issue of error.issues) {
    const path = issue.path.join('.') || issue.message;
    names.add(path);
  }
  return Array.from(names).join(', ');
}

const skipRuntimeValidation = process.env.SKIP_RUNTIME_ENV_VALIDATION === 'true';

export function loadEnv(strict = !skipRuntimeValidation): Env | null {
  const result = EnvSchema.safeParse(collectRuntimeEnv());
  if (result.success) {
    cachedEnv = result.data;
    cachedError = null;
    return cachedEnv;
  }

  cachedEnv = null;
  cachedError = result.error;
  if (strict) {
    throw new Error(`Missing runtime env: ${formatIssues(result.error)}`);
  }
  return null;
}

export function ensureRuntimeEnv(): Env {
  const env = loadEnv(true);
  if (!env) {
    throw new Error('Runtime environment is not configured.');
  }
  return env;
}

export function getEnvSnapshot(): Env | null {
  return loadEnv(false);
}

export function getEnvIssues(): string[] {
  if (!cachedError) return [];
  const issues = new Set<string>();
  for (const issue of cachedError.issues) {
    const label = issue.path.join('.') || issue.message;
    issues.add(label);
  }
  return Array.from(issues);
}

export const env: Env = new Proxy({} as Env, {
  get(_target, property) {
    const value = ensureRuntimeEnv() as Record<PropertyKey, unknown>;
    return value[property as keyof Env];
  },
  ownKeys() {
    const value = ensureRuntimeEnv() as Record<PropertyKey, unknown>;
    return Reflect.ownKeys(value);
  },
  getOwnPropertyDescriptor(_target, property) {
    const value = ensureRuntimeEnv() as Record<PropertyKey, unknown>;
    return Object.getOwnPropertyDescriptor(value, property) ?? {
      configurable: true,
      enumerable: true,
      value: undefined,
      writable: false
    };
  }
});

export { EnvSchema };
