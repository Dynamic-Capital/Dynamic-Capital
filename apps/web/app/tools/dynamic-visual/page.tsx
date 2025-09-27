import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import DynamicVisualExplorer from "@/components/tools/DynamicVisualExplorer";

export const metadata = {
  title: "Dynamic Visual Systems – Dynamic Capital",
  description:
    "Explore Dynamic Capital's interactive system visualizations that map routing policies, liquidity relays, and ensemble feedback loops in motion.",
};

export default function DynamicVisualPage() {
  return (
    <Column gap="40" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={36} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic visual systems
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Watch capital flows, routing guardrails, and liquidity adapters
          animate in real time. Toggle scenarios to inspect how desk telemetry
          responds as the network adapts.
        </Text>
      </Column>
      <DynamicVisualExplorer />
    </Column>
  );
}
