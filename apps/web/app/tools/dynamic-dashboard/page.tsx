"use client";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { DynamicDashboard } from "@/components/tools/DynamicDashboard";

export default function DynamicDashboardPage() {
  return (
    <Column gap="40" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={36} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic dashboard
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Monitor equity, activation velocity, and signal health in a single
          telemetry view tuned for the desk.
        </Text>
      </Column>
      <DynamicDashboard />
    </Column>
  );
}
