import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { HeatmapTool } from "@/components/tools/HeatmapTool";

export const metadata = {
  title: "Market Heatmap Tool – Dynamic Capital",
  description:
    "Explore Dynamic Capital's market heatmap with cross-asset momentum, volatility posture, and trend conviction insights.",
};

export default function HeatmapToolPage() {
  return (
    <Column gap="32" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={32} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Market heatmap tool
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Get the desk&apos;s multi-asset readout with commodity strength,
          volatility posture, and global momentum in one consolidated heatmap.
        </Text>
      </Column>
      <Column maxWidth={64} fillWidth>
        <HeatmapTool />
      </Column>
    </Column>
  );
}
