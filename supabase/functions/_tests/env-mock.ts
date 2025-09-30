// supabase/functions/_tests/env-mock.ts
import { EnvKey } from "../_shared/env.ts";

interface TestEnvGlobal {
  __TEST_ENV__?: Partial<Record<EnvKey, string>>;
}

let originalFetch: typeof fetch | null = null;

// Populate both a test-only env map and the runtime env so that code
// accessing either `process.env` or `Deno.env` sees the injected values.
export function setTestEnv(values: Partial<Record<EnvKey, string>>) {
  const merged: Partial<Record<EnvKey, string>> = { ...values } as any;
  // Provide sane defaults for Supabase envs to satisfy createClient checks.
  if (merged.SUPABASE_URL && !merged.SUPABASE_ANON_KEY) {
    merged.SUPABASE_ANON_KEY = "test-anon";
  }
  if (merged.SUPABASE_URL && !merged.SUPABASE_SERVICE_ROLE_KEY) {
    merged.SUPABASE_SERVICE_ROLE_KEY = "test-service";
  }

  (globalThis as TestEnvGlobal).__TEST_ENV__ = { ...merged };

  for (const [k, v] of Object.entries(merged)) {
    try {
// deno-lint-ignore ban-ts-comment
      // @ts-ignore -- Deno may be unavailable in some environments
      Deno.env.set(k, v);
    } catch {
      // ignore when Deno.env is not writable
    }
    const g = globalThis as { process?: { env: Record<string, string> } };
    if (!g.process) g.process = { env: {} };
    g.process.env[k] = v;
  }

  // Default offline fetch stub to avoid accidental network calls during tests.
  if (!originalFetch) originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 200 });
}

export function clearTestEnv() {
  const current = (globalThis as TestEnvGlobal).__TEST_ENV__;
  if (current) {
    for (const k of Object.keys(current)) {
      try {
// deno-lint-ignore ban-ts-comment
        // @ts-ignore -- Deno may be unavailable
        Deno.env.delete(k);
      } catch {
        // ignore
      }
      const g = globalThis as { process?: { env: Record<string, string> } };
      if (g.process?.env) delete g.process.env[k];
    }
  }
  delete (globalThis as TestEnvGlobal).__TEST_ENV__;

  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
}
