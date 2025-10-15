import { Column } from "@/components/dynamic-ui-system";
import { DynamicTradeAndLearn } from "@/components/tools/DynamicTradeAndLearn";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";
import { buildMetadata } from "@/lib/seo";

const pagePath = "/tools/dynamic-trade-and-learn";

export const metadata = buildMetadata({
  title: "Dynamic Trade & Learn – Dynamic Capital",
  description:
    "Blend live trading telemetry, deliberate practice labs, and mentor cadences inside the Dynamic Trade & Learn workspace.",
  canonicalPath: pagePath,
});

export default function DynamicTradeAndLearnPage() {
  return (
    <ToolWorkspaceLayout routeId="dynamic-trade-and-learn">
      <Column maxWidth={96} fillWidth>
        <DynamicTradeAndLearn />
      </Column>
    </ToolWorkspaceLayout>
  );
}
