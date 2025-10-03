import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { DynamicTradeAndLearn } from "@/components/tools/DynamicTradeAndLearn";

export const metadata = {
  title: "Dynamic Trade & Learn – Dynamic Capital",
  description:
    "Blend live trading telemetry, deliberate practice labs, and mentor cadences inside the Dynamic Trade & Learn workspace.",
};

export default function DynamicTradeAndLearnPage() {
  return (
    <Column gap="32" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={40} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic trade &amp; learn
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Pair institutional-grade execution tooling with structured learning
          paths, practice labs, and mentor accountability in a single desk
          workspace.
        </Text>
      </Column>
      <Column maxWidth={96} fillWidth>
        <DynamicTradeAndLearn />
      </Column>
    </Column>
  );
}
