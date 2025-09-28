import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { HeatmapToolExplorer } from "@/components/tools/HeatmapToolExplorer";

export const metadata = {
  title: "Dynamic Heatmap Tool – Dynamic Capital",
  description:
    "Explore Dynamic Capital's dynamic heatmap with cross-asset momentum, volatility posture, and trend conviction insights across commodities, FX, indices, and crypto.",
};

export default function HeatmapToolPage() {
  return (
    <Column gap="32" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={32} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic heatmap tool
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Toggle between commodities, FX, indices, and crypto heatmaps to spot
          cross-asset momentum, volatility posture, and leadership shifts in one
          consolidated dashboard.
        </Text>
      </Column>
      <Column maxWidth={64} fillWidth>
        <HeatmapToolExplorer />
      </Column>
    </Column>
  );
}
