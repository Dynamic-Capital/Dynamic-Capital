// scripts/check-supabase-connectivity.ts
/**
 * Fails if the Supabase REST endpoint is unreachable or returns a non-2xx status.
 *
 * Usage:
 *   deno run -A scripts/check-supabase-connectivity.ts
 */
import { requireEnvVar } from "../utils/env.ts";

const SUPABASE_URL = requireEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = requireEnvVar("SUPABASE_ANON_KEY");

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
