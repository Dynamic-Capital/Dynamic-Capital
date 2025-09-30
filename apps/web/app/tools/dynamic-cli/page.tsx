"use client";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { AdminGate } from "@/components/admin/AdminGate";
import { DynamicCliWorkbench } from "@/components/tools/DynamicCliWorkbench";

export default function DynamicCliPage() {
  return (
    <AdminGate>
      <Column gap="40" paddingY="40" align="center" horizontal="center" fillWidth>
        <Column maxWidth={36} gap="12" align="center" horizontal="center">
          <Heading variant="display-strong-s" align="center">
            Dynamic CLI/CD workbench
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            Transform maturity scenarios into actionable reports, JSON payloads,
            and Dynamic AGI fine-tune datasets without leaving the web workspace.
          </Text>
        </Column>
        <DynamicCliWorkbench />
      </Column>
    </AdminGate>
  );
}
