import { optionalEnvVar } from "../utils/env.ts";

const SUPABASE_URL = optionalEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnvVar("SUPABASE_ANON_KEY");
const SITE_URL = optionalEnvVar("SITE_URL");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SITE_URL) {
  console.warn(
    "⚠️  SUPABASE_URL, SUPABASE_ANON_KEY or SITE_URL not set. Using placeholder values; some features may be disabled.",
  );
  if (!SUPABASE_URL) {
    process.env.SUPABASE_URL = "https://stub.supabase.co";
  }
  if (!SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = "stub-anon-key";
  }
  if (!SITE_URL) {
    process.env.SITE_URL = "http://localhost:8080";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:8080";
  }
} else {
  console.log("✅ Required env vars present");
}
