import { requireEnvVar } from "../src/utils/env.ts";

// Placeholders often used during setup that should be replaced with real values
const PLACEHOLDER_PATTERNS = [/example\.com/i, /^dummy$/i];

function assertNotPlaceholder(name: string, value: string) {
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(value))) {
    throw new Error(`Env ${name} must be replaced with an actual value`);
  }
}

try {
  const url = requireEnvVar("SUPABASE_URL");
  assertNotPlaceholder("SUPABASE_URL", url);

  const anonKey = requireEnvVar("SUPABASE_ANON_KEY");
  assertNotPlaceholder("SUPABASE_ANON_KEY", anonKey);

  console.log("✅ Required env vars present");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`❌ ${message}`);
  process.exit(1);
}
