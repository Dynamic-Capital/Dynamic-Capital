"use client";

import {
  Badge,
  Card,
  Column,
  Heading,
  Row,
  Text,
  Button,
} from "@once-ui-system/core";
import { useMemo, useState } from "react";

import type { LiveTimelineEntry } from "@/data/live-intel";

type TimelineViewProps = {
  entries: readonly LiveTimelineEntry[];
};

type TimelineFilter = "all" | LiveTimelineEntry["status"];

const FILTERS: ReadonlyArray<{ id: TimelineFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "complete", label: "Completed" },
  { id: "pending", label: "Pending" },
  { id: "upcoming", label: "Upcoming" },
];

const STATUS_COLOR: Record<LiveTimelineEntry["status"], string> = {
  complete: "green-strong",
  pending: "brand-strong",
  upcoming: "neutral-strong",
};

function Tabs({ value, onChange }: { value: TimelineFilter; onChange: (value: TimelineFilter) => void }) {
  return (
    <Row
      role="tablist"
      gap="8"
      padding="4"
      radius="l"
      background="neutral-alpha-weak"
      horizontal="start"
    >
      {FILTERS.map((filter) => (
        <Button
          key={filter.id}
          type="button"
          role="tab"
          aria-selected={value === filter.id}
          variant={value === filter.id ? "secondary" : "tertiary"}
          size="s"
          label={filter.label}
          onClick={() => onChange(filter.id)}
        />
      ))}
    </Row>
  );
}

export function TimelineView({ entries }: TimelineViewProps) {
  const [activeTab, setActiveTab] = useState<TimelineFilter>("all");

  const filteredEntries = useMemo(() => {
    if (activeTab === "all") {
      return entries;
    }
    return entries.filter((entry) => entry.status === activeTab);
  }, [entries, activeTab]);

  return (
    <Card as="section" id="activity" padding="32" radius="2xl" gap="24" background="surface">
      <Row horizontal="between" wrap gap="16" vertical="center">
        <Heading as="h2" size="display-xs">
          Desk timeline
        </Heading>
        <Tabs value={activeTab} onChange={setActiveTab} />
      </Row>
      <Column gap="16" as="ul">
        {filteredEntries.map((item) => (
          <Card key={`${item.title}-${item.timestamp}`} as="li" padding="20" radius="xl" background="transparent" border="neutral-alpha-medium">
            <Row horizontal="between" vertical="center" gap="12">
              <Column gap="4">
                <Text variant="label-strong-m" weight="strong">
                  {item.title}
                </Text>
                <Text variant="body-m" onBackground="neutral-strong">
                  {item.description}
                </Text>
              </Column>
              <Column align="end" gap="8" minWidth={12}>
                <Badge effect={false} onBackground={STATUS_COLOR[item.status]} background="transparent">
                  <Text variant="label-strong-s" onBackground={STATUS_COLOR[item.status]}>
                    {item.status === "complete"
                      ? "Completed"
                      : item.status === "pending"
                      ? "Pending"
                      : "Upcoming"}
                  </Text>
                </Badge>
                <Text variant="label-s" onBackground="neutral-medium">
                  {item.timestamp}
                </Text>
              </Column>
            </Row>
          </Card>
        ))}
      </Column>
    </Card>
  );
}
