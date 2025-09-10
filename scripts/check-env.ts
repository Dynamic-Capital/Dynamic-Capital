import { optionalEnvVar } from "../utils/env.ts";

const SUPABASE_URL = optionalEnvVar("SUPABASE_URL");
const SUPABASE_ANON_KEY = optionalEnvVar("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set. Using placeholder values; some features may be disabled.",
  );
}

const url = SUPABASE_URL || "https://stub.supabase.co";
const key = SUPABASE_ANON_KEY || "stub-anon-key";

process.env.SUPABASE_URL = url;
process.env.NEXT_PUBLIC_SUPABASE_URL = url;
process.env.SUPABASE_ANON_KEY = key;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  console.log("✅ Required env vars present");
}
