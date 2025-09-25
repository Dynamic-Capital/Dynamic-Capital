import { Button, Column, Heading, Row, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";

export type SectionNavItem = {
  id: string;
  label: string;
  description?: string;
  icon?: IconName;
};

interface SectionNavigationProps {
  items: SectionNavItem[];
}

function getUniqueItems(items: SectionNavItem[]): SectionNavItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export function SectionNavigation({ items }: SectionNavigationProps) {
  const uniqueItems = getUniqueItems(items);

  if (uniqueItems.length === 0) {
    return null;
  }

  return (
    <Column
      id="section-navigation"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="20"
      shadow="l"
    >
      <Column gap="8" maxWidth={32}>
        <Heading variant="display-strong-xs">Navigate the desk</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Jump straight to the section you need—live market intel, pricing,
          mentorship, and compliance resources are all one click away.
        </Text>
      </Column>
      <Row as="nav" aria-label="Landing page sections" gap="12" wrap>
        {uniqueItems.map((item) => (
          <Button
            key={item.id}
            href={`#${item.id}`}
            variant="secondary"
            size="s"
            data-border="rounded"
            prefixIcon={item.icon}
            aria-label={item.description
              ? `${item.label} — ${item.description}`
              : `Jump to ${item.label}`}
            title={item.description}
          >
            {item.label}
          </Button>
        ))}
      </Row>
    </Column>
  );
}

export default SectionNavigation;
