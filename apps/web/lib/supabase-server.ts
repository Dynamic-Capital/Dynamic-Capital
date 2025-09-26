import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config/supabase-runtime";
import type { InvestorDatabase } from "@/lib/investor-metrics";

export type ServerSupabaseClient = SupabaseClient<InvestorDatabase>;

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
