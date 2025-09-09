import { optionalEnvVar } from "../src/utils/env.ts";

const missing: string[] = [];
if (!optionalEnvVar("SUPABASE_URL")) missing.push("SUPABASE_URL");
if (!optionalEnvVar("SUPABASE_ANON_KEY")) missing.push("SUPABASE_ANON_KEY");

if (missing.length === 0) {
  console.log("✅ Required env vars present");
} else {
  console.warn(
    `⚠️ Missing env vars: ${missing.join(", ")}. Using placeholders so build can continue.`,
  );
}

