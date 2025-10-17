"use client";

import { Card, Column, SegmentedControl, Text } from "@once-ui-system/core";

import styles from "./SectionNavigation.module.scss";

export type SectionNavigationItem = {
  id: string;
  label: string;
  icon: (props: { active: boolean; className?: string }) => JSX.Element;
};

type SectionNavigationProps = {
  items: readonly SectionNavigationItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
};

export function SectionNavigation({
  items,
  activeId,
  onSelect,
  ariaLabel = "Sections",
}: SectionNavigationProps) {
  const buttons = items.map((item) => ({
    value: item.id,
    size: "l" as const,
    variant: "ghost" as const,
    "aria-controls": item.id,
    "aria-label": item.label,
    children: (
      <Column
        key={item.id}
        gap="6"
        horizontal="center"
        className={styles.buttonContent}
      >
        <item.icon
          active={activeId === item.id}
          className={styles.icon}
        />
        <Text as="span" variant="label-strong-s" className={styles.label}>
          {item.label}
        </Text>
      </Column>
    ),
  }));

  return (
    <nav aria-label={ariaLabel} className={styles.container}>
      <Card
        as="div"
        padding="0"
        radius="xl"
        background="transparent"
        border="transparent"
        className={styles.card}
      >
        <div className={styles.segmentRoot}>
          <SegmentedControl
            buttons={buttons}
            selected={activeId}
            onToggle={(value) => onSelect(value)}
            fillWidth
          />
        </div>
      </Card>
    </nav>
  );
}

export default SectionNavigation;
