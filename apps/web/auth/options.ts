import { SupabaseAdapter } from "@auth/supabase-adapter";
import GitHub from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";

import { isDevelopment } from "@/config/node-env";
import { requireEnvVar } from "@/utils/env";

function resolveRequiredEnv(
  key: string,
  aliases: readonly string[] = [],
  devFallback?: string,
): string {
  try {
    return requireEnvVar(key, aliases);
  } catch (error) {
    if (isDevelopment && devFallback !== undefined) {
      return devFallback;
    }
    throw error;
  }
}

const supabaseUrl = resolveRequiredEnv(
  "SUPABASE_URL",
  ["NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"],
  "https://stub.supabase.co",
);
const supabaseServiceRoleKey = resolveRequiredEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  [],
  "stub-service-role-key",
);
const githubId = resolveRequiredEnv("GITHUB_ID", [], "stub-github-client-id");
const githubSecret = resolveRequiredEnv(
  "GITHUB_SECRET",
  [],
  "stub-github-client-secret",
);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseServiceRoleKey,
  }),
  providers: [
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
    }),
  ],
};

export default authOptions;
