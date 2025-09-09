import { optionalEnvVar } from "../src/utils/env.ts";

const SUPABASE_URL = optionalEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnvVar("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set. Using placeholder values; some features may be disabled.",
  );
  if (!SUPABASE_URL) {
    process.env.SUPABASE_URL = "https://example.supabase.co";
  }
  if (!SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = "anon-key-placeholder";
  }
} else {
  console.log("✅ Required env vars present");
}
