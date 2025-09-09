import { requireEnvVar } from "../src/utils/env.ts";

try {
  requireEnvVar("SUPABASE_URL");
  requireEnvVar("SUPABASE_ANON_KEY");
  console.log("✅ Required env vars present");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`❌ ${message}`);
  process.exit(1);
}
