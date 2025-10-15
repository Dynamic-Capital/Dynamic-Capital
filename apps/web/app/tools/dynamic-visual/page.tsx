import DynamicVisualExplorer from "@/components/tools/DynamicVisualExplorer";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";
import { buildMetadata } from "@/lib/seo";

const pagePath = "/tools/dynamic-visual";

export const metadata = buildMetadata({
  title: "Dynamic Visual Systems – Dynamic Capital",
  description:
    "Explore Dynamic Capital's interactive system visualizations that map routing policies, liquidity relays, and ensemble feedback loops in motion.",
  canonicalPath: pagePath,
});

export default function DynamicVisualPage() {
  return (
    <ToolWorkspaceLayout routeId="dynamic-visual">
      <DynamicVisualExplorer />
    </ToolWorkspaceLayout>
  );
}
