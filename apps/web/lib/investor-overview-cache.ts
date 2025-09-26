import { unstable_cache } from "next/cache";

import { fetchInvestorOverview } from "@/lib/investor-metrics";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const getCachedInvestorOverview = unstable_cache(
  async (profileId: string) => {
    const supabase = await createServerSupabaseClient();
    return fetchInvestorOverview(supabase, profileId);
  },
  ["investor-overview"],
  {
    revalidate: 60,
    tags: ["investor-overview"],
  },
);
