import { redirect } from "next/navigation";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";
import { InvestorMetricsPanel } from "@/components/investor/InvestorMetricsPanel";
import { getCachedInvestorOverview } from "@/lib/investor-overview-cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buildMetadata } from "@/lib/seo";

const pagePath = "/investor";

export const metadata = buildMetadata({
  title: "Investor Dashboard – Dynamic Capital",
  description:
    "Review your private fund equity, track buyback burns, and confirm subscription health in one place.",
  canonicalPath: pagePath,
  noIndex: true,
  noFollow: true,
});

export default async function InvestorPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/investor")}`);
  }

  try {
    const overview = await getCachedInvestorOverview(user.id);

    return (
      <Column
        gap="24"
        paddingY="32"
        align="center"
        horizontal="center"
        fillWidth
      >
        <Column maxWidth={28} gap="12" align="center" horizontal="center">
          <Heading variant="display-strong-s" align="center">
            Investor overview
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            Live metrics for your Dynamic Capital allocation, token burns, and
            subscription cadence.
          </Text>
        </Column>
        <InvestorMetricsPanel overview={overview} />
      </Column>
    );
  } catch (error) {
    console.error("Failed to load investor metrics", error);
    return (
      <Column
        gap="16"
        paddingY="32"
        align="center"
        horizontal="center"
        fillWidth
      >
        <Heading variant="heading-strong-m">
          Investor metrics unavailable
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          We could not load your investor metrics right now. Refresh the page or
          contact support if the issue persists.
        </Text>
      </Column>
    );
  }
}
