import DynamicVisualExplorer from "@/components/tools/DynamicVisualExplorer";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";

export const metadata = {
  title: "Dynamic Visual Systems – Dynamic Capital",
  description:
    "Explore Dynamic Capital's interactive system visualizations that map routing policies, liquidity relays, and ensemble feedback loops in motion.",
};

export default function DynamicVisualPage() {
  return (
    <ToolWorkspaceLayout routeId="dynamic-visual">
      <DynamicVisualExplorer />
    </ToolWorkspaceLayout>
  );
}
