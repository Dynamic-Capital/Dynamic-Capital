// scripts/check-supabase-connectivity.ts
/**
 * Verifies the Supabase REST endpoint is reachable. If the required environment
 * variables are missing, the check is skipped with a warning.
 *
 * Usage:
 *   deno run -A scripts/check-supabase-connectivity.ts
 */
import { optionalEnvVar } from "../apps/web/utils/env.ts";

const SUPABASE_URL = optionalEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnvVar("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️  Skipping Supabase connectivity check: SUPABASE_URL or SUPABASE_ANON_KEY not set.",
  );
  Deno.exit(0);
}

try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    console.error(
      `\u274c  Supabase connectivity check failed: ${res.status} ${res.statusText}`,
    );
    Deno.exit(1);
  }

  console.log("\u2705 Supabase REST endpoint reachable");
  Deno.exit(0);
} catch (err) {
  console.error("\u274c  Supabase connectivity error:", err?.message ?? err);
  Deno.exit(1);
}
