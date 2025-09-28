import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import DynamicAppWorkbench from "@/components/tools/DynamicAppWorkbench";

export const metadata = {
  title: "Dynamic App Builder – Dynamic Capital",
  description:
    "Compose trader, operations, and compliance journeys with automation guardrails to launch Dynamic Capital desks faster.",
};

export default function DynamicAppPage() {
  return (
    <Column gap="40" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={36} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic app builder
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Orchestrate persona blueprints, automation guardrails, and module
          readiness to keep every launch motion synchronized.
        </Text>
      </Column>
      <DynamicAppWorkbench />
    </Column>
  );
}
