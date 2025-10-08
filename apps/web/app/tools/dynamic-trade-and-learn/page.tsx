import { Column } from "@/components/dynamic-ui-system";
import { DynamicTradeAndLearn } from "@/components/tools/DynamicTradeAndLearn";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";

export const metadata = {
  title: "Dynamic Trade & Learn – Dynamic Capital",
  description:
    "Blend live trading telemetry, deliberate practice labs, and mentor cadences inside the Dynamic Trade & Learn workspace.",
};

export default function DynamicTradeAndLearnPage() {
  return (
    <ToolWorkspaceLayout routeId="dynamic-trade-and-learn">
      <Column maxWidth={96} fillWidth>
        <DynamicTradeAndLearn />
      </Column>
    </ToolWorkspaceLayout>
  );
}
