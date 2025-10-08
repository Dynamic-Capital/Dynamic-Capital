import { Column } from "@/components/dynamic-ui-system";
import { TradeJournalWorkspace } from "@/components/tools/TradeJournalWorkspace";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";

export const metadata = {
  title: "Dynamic Trade Journal – Dynamic Capital",
  description:
    "Compile disciplined trade reviews with automated highlights, lessons, and coach prompts from your session telemetry.",
};

export default function TradeJournalToolPage() {
  return (
    <ToolWorkspaceLayout routeId="trade-journal">
      <Column maxWidth={72} fillWidth>
        <TradeJournalWorkspace />
      </Column>
    </ToolWorkspaceLayout>
  );
}
