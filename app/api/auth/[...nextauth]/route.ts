import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import GitHub from "next-auth/providers/github";

const handler = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID || "", 
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
});

export { handler as GET, handler as POST };
