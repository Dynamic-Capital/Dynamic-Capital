"use client";

import { Button, Card, Flex, Icon, Text } from "@once-ui-system/core";

import type { SectionId } from "../home/model";

export type NavigationRailProps = {
  items: Array<{ id: SectionId; label: string; icon: string }>;
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  compact: boolean;
};

export function NavigationRail({ items, active, onNavigate, compact }: NavigationRailProps) {
  return (
    <Card
      as="nav"
      background="surface"
      border="neutral-alpha-medium"
      radius="xl"
      padding="s"
      style={{ position: "sticky", bottom: compact ? 16 : 32, zIndex: 10 }}
    >
      <Flex direction="row" horizontal="between" gap="s" wrap>
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <Button
              key={item.id}
              variant={selected ? "primary" : "tertiary"}
              size="s"
              onClick={() => onNavigate(item.id)}
              prefixIcon={item.icon}
            >
              <Text variant="body-default-s">{item.label}</Text>
            </Button>
          );
        })}
      </Flex>
    </Card>
  );
}
