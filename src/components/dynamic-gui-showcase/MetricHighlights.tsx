import { Column, Icon, Row, Text } from "@/components/dynamic-ui-system";

import type { MetricHighlight } from "./types";

interface MetricHighlightsProps {
  metrics: MetricHighlight[];
}

export function MetricHighlights({ metrics }: MetricHighlightsProps) {
  return (
    <Row gap="16" wrap horizontal="center">
      {metrics.map((metric) => (
        <Column
          key={metric.label}
          gap="12"
          background="surface"
          border="brand-alpha-weak"
          radius="l"
          paddingX="20"
          paddingY="16"
          minWidth={16}
          fillWidth
        >
          <Row gap="12" vertical="center">
            <Icon name={metric.icon} onBackground="brand-medium" />
            <Column gap="4">
              <Text variant="heading-strong-m">{metric.value}</Text>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {metric.label}
              </Text>
            </Column>
          </Row>
          <Text variant="body-default-s" onBackground="neutral-medium">
            {metric.description}
          </Text>
        </Column>
      ))}
    </Row>
  );
}
