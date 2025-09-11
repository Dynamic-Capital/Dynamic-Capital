import { z } from 'zod';
import { getEnvVar, optionalEnvVar } from './utils/env.ts';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional()
});

export const ENV = schema.parse({
  NODE_ENV: getEnvVar('NODE_ENV'),
  NEXT_PUBLIC_API_URL: optionalEnvVar('NEXT_PUBLIC_API_URL'),
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NEXT_PUBLIC_SENTRY_DSN: getEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
});
