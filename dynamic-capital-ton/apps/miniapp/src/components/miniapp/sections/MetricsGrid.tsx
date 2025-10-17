"use client";

import { Card, Column, Grid, Text } from "@once-ui-system/core";

import type { LiveMetric } from "@/data/live-intel";

export function MetricsGrid({ metrics }: { metrics: LiveMetric[] }) {
  return (
    <Grid columns="3" gap="m" m={{ columns: "1" }} s={{ columns: "1" }}>
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          background="surface"
          border="neutral-alpha-medium"
          radius="l"
          padding="l"
        >
          <Column gap="s">
            <Text variant="body-default-s" onBackground="neutral-weak">
              {metric.label}
            </Text>
            <Text variant="heading-strong-m">{metric.value}</Text>
            {metric.change && (
              <Text variant="body-default-s" onBackground="neutral-weak">
                {metric.change}
              </Text>
            )}
          </Column>
        </Card>
      ))}
    </Grid>
  );
}
