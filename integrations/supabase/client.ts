// Supabase client and helpers
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getEnvVar } from '../../utils/env.ts';
import type { Database } from './types.ts';

const PLACEHOLDER_URL = 'https://example.supabase.co';
const PLACEHOLDER_ANON_KEY = 'anon-key-placeholder';

export const SUPABASE_URL = getEnvVar('SUPABASE_URL') ?? PLACEHOLDER_URL;
export const SUPABASE_ANON_KEY =
  getEnvVar('SUPABASE_ANON_KEY', ['SUPABASE_KEY']) ?? PLACEHOLDER_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ?? '';
export let SUPABASE_ENV_ERROR = '';

if (SUPABASE_URL === PLACEHOLDER_URL || SUPABASE_ANON_KEY === PLACEHOLDER_ANON_KEY) {
  SUPABASE_ENV_ERROR = 'Missing required Supabase env vars';
  console.warn('Configuration warning:', SUPABASE_ENV_ERROR);
}

const queryCounts: Record<string, number> = {};

const loggingFetch: typeof fetch = async (input, init) => {
  const start = Date.now();
  const res = await fetch(input as RequestInfo, init);
  const end = Date.now();
  try {
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = input.toString();
    }
    const path = new URL(url).pathname;
    queryCounts[path] = (queryCounts[path] || 0) + 1;
    console.log(`[Supabase] ${path} - ${res.status} - ${end - start}ms`);
  } catch {
    // ignore logging errors
  }
  return res;
};

export function getQueryCounts() {
  return { ...queryCounts };
}

// Supabase types are unavailable in the vendored esm build, so fall back to `any`.
// deno-lint-ignore no-explicit-any
export type SupabaseClient = any;

export function createClient(key: 'anon' | 'service' = 'anon'): SupabaseClient {
  if (SUPABASE_ENV_ERROR) {
    throw new Error(SUPABASE_ENV_ERROR);
  }
  const k =
    key === 'service' && SUPABASE_SERVICE_ROLE_KEY
      ? SUPABASE_SERVICE_ROLE_KEY
      : SUPABASE_ANON_KEY;
  const isBrowser = typeof window !== 'undefined';
  const storage = isBrowser
    ? window.localStorage
    : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };

  return createSupabaseClient(SUPABASE_URL, k, {
    auth: {
      storage,
      persistSession: isBrowser,
      autoRefreshToken: true,
    },
    global: { fetch: loggingFetch },
  }) as SupabaseClient;
}

// Convenience client for modules that just need anon access
export const supabase = SUPABASE_ENV_ERROR
  ? (new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase environment variables are not set.');
        },
      },
    ) as unknown as SupabaseClient)
  : (createClient() as SupabaseClient);

