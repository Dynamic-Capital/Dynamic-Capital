"use client";

import {
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import {
  InsightCard,
  type InsightCardTag,
  type MoversSection,
  MoversTable,
  type MoversTableProps,
  type StrengthMeterEntry,
  StrengthMeterList,
  type VolatilityBucket,
  VolatilityBucketPanel,
  type VolatilityMeterEntry,
  VolatilityMeterList,
} from "./MarketSnapshotPrimitives";

export interface SnapshotCardConfig {
  title: string;
  description: string;
  tag?: InsightCardTag;
}

export interface SnapshotHeroConfig {
  heading: string;
  summary: string;
  tag: InsightCardTag;
}

export interface SnapshotMomentumEntry {
  id: string;
  headline: string;
  detail: string;
}

export interface SnapshotHeatmapConfig {
  card: SnapshotCardConfig;
  notes: string[];
  placeholder: string;
}

export interface StaticMarketSnapshotConfig {
  id: string;
  hero: SnapshotHeroConfig;
  strength: {
    card: SnapshotCardConfig;
    entries: StrengthMeterEntry[];
  };
  volatilityMeter: {
    card: SnapshotCardConfig;
    entries: VolatilityMeterEntry[];
  };
  movers: {
    card: SnapshotCardConfig;
    sections: MoversSection[];
    tableOverrides?: Pick<
      MoversTableProps,
      "columnLabels" | "formatters" | "emptyLabel"
    >;
  };
  volatilityBuckets: {
    card: SnapshotCardConfig;
    buckets: VolatilityBucket[];
  };
  momentum: {
    card: SnapshotCardConfig;
    entries: SnapshotMomentumEntry[];
  };
  heatmap: SnapshotHeatmapConfig;
}

export function StaticMarketSnapshotSection(
  { config }: { config: StaticMarketSnapshotConfig },
) {
  const {
    id,
    hero,
    strength,
    volatilityMeter,
    movers,
    volatilityBuckets,
    momentum,
    heatmap,
  } = config;

  const heroTagTone = hero.tag.tone ?? "neutral-alpha-weak";

  return (
    <Column
      as="section"
      id={id}
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="m"
    >
      <Column gap="12" maxWidth={48}>
        <Row gap="8" vertical="center" wrap>
          <Heading variant="display-strong-xs">{hero.heading}</Heading>
          <Tag
            size="s"
            background={heroTagTone}
            prefixIcon={hero.tag.icon}
          >
            {hero.tag.label}
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          {hero.summary}
        </Text>
      </Column>

      <Row gap="24" wrap>
        <Column flex={1} minWidth={32} gap="24">
          <InsightCard {...strength.card}>
            <StrengthMeterList entries={strength.entries} />
          </InsightCard>

          <InsightCard {...volatilityMeter.card}>
            <VolatilityMeterList entries={volatilityMeter.entries} />
          </InsightCard>
        </Column>

        <Column flex={1} minWidth={32} gap="24">
          <InsightCard {...movers.card}>
            <Column gap="16">
              {movers.sections.map((section) => (
                <MoversTable
                  key={section.title}
                  {...section}
                  columnLabels={movers.tableOverrides?.columnLabels}
                  formatters={movers.tableOverrides?.formatters}
                  emptyLabel={movers.tableOverrides?.emptyLabel}
                />
              ))}
            </Column>
          </InsightCard>

          <InsightCard {...volatilityBuckets.card}>
            <Row gap="16" wrap>
              {volatilityBuckets.buckets.map((bucket) => (
                <VolatilityBucketPanel key={bucket.title} {...bucket} />
              ))}
            </Row>
          </InsightCard>
        </Column>
      </Row>

      <Row gap="24" wrap>
        <Column flex={1} minWidth={32} gap="24">
          <InsightCard {...momentum.card}>
            <Column as="ul" gap="12" fillWidth>
              {momentum.entries.map((entry) => (
                <Row key={entry.id} as="li" gap="12" vertical="start">
                  <Tag size="s" background="neutral-alpha-weak">
                    {entry.id}
                  </Tag>
                  <Column gap="4" align="start">
                    <Text variant="body-strong-s">{entry.headline}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {entry.detail}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Column>
          </InsightCard>
        </Column>

        <Column flex={1} minWidth={32}>
          <InsightCard {...heatmap.card}>
            <Column gap="12">
              {heatmap.notes.map((note, index) => (
                <Text
                  key={`${id}-heatmap-note-${index}`}
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {note}
                </Text>
              ))}
              <Text variant="body-default-s" onBackground="neutral-weak">
                {heatmap.placeholder}
              </Text>
            </Column>
          </InsightCard>
        </Column>
      </Row>
    </Column>
  );
}

export default StaticMarketSnapshotSection;
