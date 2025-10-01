import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config/supabase-runtime";
import type { InvestorDatabase } from "@/lib/investor-metrics";

function inferServerClientType() {
  return createServerClient<InvestorDatabase>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [],
      },
    },
  );
}

export type ServerSupabaseClient = ReturnType<typeof inferServerClientType>;

export async function createServerSupabaseClient(): Promise<
  ServerSupabaseClient
> {
  const cookieStore = await cookies();

  return createServerClient<InvestorDatabase>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
      },
    },
  );
}
