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
});

export const { GET, POST } = handlers;
