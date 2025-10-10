import { TradeJournalWorkspace } from "@/components/tools/TradeJournalWorkspace";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";
import { DeskSection } from "@/components/workspaces/DeskSection";

export const metadata = {
  title: "Dynamic Trade Journal – Dynamic Capital",
  description:
    "Compile disciplined trade reviews with automated highlights, lessons, and coach prompts from your session telemetry.",
};

export default function TradeJournalToolPage() {
  return (
    <ToolWorkspaceLayout routeId="trade-journal">
      <DeskSection
        anchor="journal-form"
        background="surface"
        border="neutral-alpha-medium"
        shadow="s"
        width="wide"
        contentClassName="gap-12"
      >
        <TradeJournalWorkspace />
      </DeskSection>
    </ToolWorkspaceLayout>
  );
}
