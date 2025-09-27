import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import GitHub from "next-auth/providers/github";

const { handlers } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL || "https://stub.supabase.co",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "stub-service-role-key",
  }),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  /**
   * Allow NextAuth to trust the host header when NEXTAUTH_URL is not set.
   * This keeps local development flows working on arbitrary ports such as
   * http://127.0.0.1:53682/auth?state=... without requiring additional envs.
   */
  trustHost: true,
});

export const { GET, POST } = handlers;
