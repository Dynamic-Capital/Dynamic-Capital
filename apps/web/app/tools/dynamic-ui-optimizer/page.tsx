"use client";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import DynamicUiOptimizer from "@/components/tools/DynamicUiOptimizer";

export default function DynamicUiOptimizerPage() {
  return (
    <Column gap="40" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={36} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic UI optimizer
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Visualize readiness velocity, automation pipeline conversion, and
          channel performance so you can prioritize the next rollout for the
          desk.
        </Text>
      </Column>
      <DynamicUiOptimizer />
    </Column>
  );
}
