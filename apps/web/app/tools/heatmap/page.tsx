import { Column } from "@/components/dynamic-ui-system";
import { HeatmapTool } from "@/components/tools/HeatmapTool";
import { ToolWorkspaceLayout } from "@/components/workspaces/ToolWorkspaceLayout";
import { buildMetadata } from "@/lib/seo";

const pagePath = "/tools/heatmap";

export const metadata = buildMetadata({
  title: "Market Heatmap Tool – Dynamic Capital",
  description:
    "Explore Dynamic Capital's market heatmap with cross-asset momentum, volatility posture, and trend conviction insights.",
  canonicalPath: pagePath,
});

export default function HeatmapToolPage() {
  return (
    <ToolWorkspaceLayout routeId="heatmap">
      <Column maxWidth={64} fillWidth>
        <HeatmapTool assetClass="commodities" />
      </Column>
    </ToolWorkspaceLayout>
  );
}
