"use client";

import { Card, Column, Flex, Icon, Text } from "@once-ui-system/core";

import type { LiveTimelineEntry } from "@/data/live-intel";

export function ActivityTimeline({ timeline }: { timeline: LiveTimelineEntry[] }) {
  return (
    <Column as="section" id="activity" gap="l">
      <Column gap="s">
        <Text variant="code-strong-s" onBackground="brand-strong">
          Desk activity
        </Text>
        <Text variant="heading-strong-l">Stay aligned with operational checkpoints</Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Milestones update as your wallet clears verification, plan syncs, and minting windows progress.
        </Text>
      </Column>
      <Column gap="m">
        {timeline.map((item) => (
          <Card key={item.title} background="surface" border="neutral-alpha-medium" radius="l" padding="l">
            <Flex direction="row" horizontal="between" vertical="center" wrap gap="s">
              <Column gap="xs">
                <Text variant="body-strong-s">{item.title}</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {item.description}
                </Text>
              </Column>
              <Column gap="xs" horizontal="end" minWidth={120}>
                <Text variant="body-default-s" onBackground="neutral-weak" align="end">
                  {item.timestamp}
                </Text>
                <Text variant="body-default-xs" onBackground="neutral-weak" align="end">
                  {item.status}
                </Text>
              </Column>
            </Flex>
          </Card>
        ))}
      </Column>
    </Column>
  );
}
