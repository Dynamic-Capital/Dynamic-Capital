import { redirect } from "next/navigation";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";
import { InvestorMetricsPanel } from "@/components/investor/InvestorMetricsPanel";
import { PageShellVariant } from "@/components/layout/PageShell";
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
      <>
        <PageShellVariant variant="workspace" />
        <Column gap="24" paddingY="32" horizontal="stretch" fillWidth>
          <Column maxWidth={36} gap="12" horizontal="stretch">
            <Heading variant="display-strong-s" align="start">
              Investor overview
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              align="start"
            >
              Live metrics for your Dynamic Capital allocation, token burns, and
              subscription cadence.
            </Text>
          </Column>
          <InvestorMetricsPanel overview={overview} />
        </Column>
      </>
    );
  } catch (error) {
    console.error("Failed to load investor metrics", error);
    return (
      <>
        <PageShellVariant variant="workspace" />
        <Column gap="16" paddingY="32" horizontal="stretch" fillWidth>
          <Heading variant="heading-strong-m" align="start">
            Investor metrics unavailable
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="start"
          >
            We could not load your investor metrics right now. Refresh the page
            or contact support if the issue persists.
          </Text>
        </Column>
      </>
    );
  }
}
