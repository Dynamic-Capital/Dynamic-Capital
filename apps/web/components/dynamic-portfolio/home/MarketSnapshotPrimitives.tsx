"use client";

import {
  type Colors,
  Column,
  Heading,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { AsciiShaderText } from "@/components/ui/AsciiShaderText";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IconName } from "@/resources/icons";
import type { ReactNode } from "react";

export type SnapshotTone = "strong" | "balanced" | "soft";

export type TagBackground =
  | Colors
  | "page"
  | "surface"
  | "overlay"
  | "transparent";

export interface InsightCardTag {
  label: string;
  icon?: IconName;
  tone?: TagBackground;
}

export interface InsightCardProps {
  title: string;
  description?: string;
  tag?: InsightCardTag;
  children: ReactNode;
}

export function InsightCard(
  { title, description, tag, children }: InsightCardProps,
) {
  return (
    <Column
      background="page"
      border="neutral-alpha-weak"
      radius="l"
      padding="l"
      gap="16"
      align="start"
    >
      <Column gap="8" align="start">
        {tag
          ? (
            <Tag
              size="s"
              background={tag.tone ?? "neutral-alpha-weak"}
              prefixIcon={tag.icon}
            >
              {tag.label}
            </Tag>
          )
          : null}
        <Heading as="h3" variant="heading-strong-m">
          {title}
        </Heading>
        {description
          ? (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          )
          : null}
      </Column>
      {children}
    </Column>
  );
}

export interface StrengthMeterEntry {
  id: string;
  code: string;
  summary: string;
  rank: number;
  tone: SnapshotTone;
}

export const DEFAULT_STRENGTH_TONE_STYLES: Record<
  SnapshotTone,
  { label: string; background: TagBackground }
> = {
  strong: { label: "Leadership", background: "brand-alpha-weak" },
  balanced: { label: "Balanced", background: "neutral-alpha-weak" },
  soft: { label: "Under pressure", background: "danger-alpha-weak" },
};

export function StrengthMeterList({
  entries,
  toneStyles = DEFAULT_STRENGTH_TONE_STYLES,
}: {
  entries: StrengthMeterEntry[];
  toneStyles?: Partial<
    Record<SnapshotTone, { label: string; background: TagBackground }>
  >;
}) {
  return (
    <Row gap="16" wrap>
      {entries.map((entry) => {
        const tone = toneStyles[entry.tone] ??
          DEFAULT_STRENGTH_TONE_STYLES[entry.tone];
        return (
          <Column
            key={entry.id}
            background="page"
            border="neutral-alpha-weak"
            radius="l"
            padding="l"
            gap="12"
            minWidth={20}
            flex={1}
          >
            <Row horizontal="between" vertical="center" gap="8">
              <Row gap="8" vertical="center">
                <Tag size="s" background="neutral-alpha-weak">
                  #{entry.rank}
                </Tag>
                <Heading as="h4" variant="heading-strong-s">
                  {entry.code}
                </Heading>
              </Row>
              <Tag size="s" background={tone.background}>
                {tone.label}
              </Tag>
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {entry.summary}
            </Text>
          </Column>
        );
      })}
    </Row>
  );
}

export interface VolatilityMeterEntry {
  id: string;
  code: string;
  summary: string;
  rank: number;
}

export function VolatilityMeterList(
  { entries }: { entries: VolatilityMeterEntry[] },
) {
  return (
    <Column gap="12">
      {entries.map((entry) => (
        <Row key={entry.id} gap="12" vertical="start">
          <Tag size="s" background="neutral-alpha-weak">
            #{entry.rank}
          </Tag>
          <Column gap="4">
            <Text variant="body-strong-s">{entry.code}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {entry.summary}
            </Text>
          </Column>
        </Row>
      ))}
    </Column>
  );
}

export interface MoversEntry {
  id: string;
  label: string;
  symbol?: string;
  changePercent?: number;
  change?: number;
  extra?: number;
  last?: number;
}

export interface MoversSection {
  title: string;
  tone: TagBackground;
  data: MoversEntry[];
  iconName?: IconName;
}

export interface MoversTableProps extends MoversSection {
  columnLabels?: {
    changePercent?: string | null;
    change?: string | null;
    extra?: string | null;
    last?: string | null;
  };
  formatters?: {
    changePercent?: (value: number | undefined) => string;
    change?: (value: number | undefined) => string;
    extra?: (value: number | undefined) => string;
    last?: (value: number | undefined) => string;
  };
  emptyLabel?: string;
}

const formatSignedPercent = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const formatted = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${formatted}%`;
  }
  if (value < 0) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
};

const formatDecimal = (value: number | undefined, digits = 4) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(digits);
};

type MoversFormatters = NonNullable<MoversTableProps["formatters"]>;

const defaultMoversFormatters: Required<MoversFormatters> = {
  changePercent: formatSignedPercent,
  change: (value) => formatDecimal(value),
  extra: (value) => formatDecimal(value, 1),
  last: (value) => {
    if (value === undefined || Number.isNaN(value)) {
      return "—";
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 6,
    }).format(value);
  },
};

export function MoversTable({
  title,
  tone,
  data,
  iconName,
  columnLabels,
  formatters,
  emptyLabel = "No movers available.",
}: MoversTableProps) {
  const resolvedFormatters: Required<MoversFormatters> = {
    changePercent: formatters?.changePercent ??
      defaultMoversFormatters.changePercent,
    change: formatters?.change ?? defaultMoversFormatters.change,
    extra: formatters?.extra ?? defaultMoversFormatters.extra,
    last: formatters?.last ?? defaultMoversFormatters.last,
  };
  const labels = {
    changePercent: columnLabels?.changePercent ?? "Change %",
    change: columnLabels?.change ?? "Change",
    extra: columnLabels?.extra ?? "Pips",
    last: columnLabels?.last ?? "Last",
  };
  const visibility = {
    changePercent: columnLabels?.changePercent !== null,
    change: columnLabels?.change !== null,
    extra: columnLabels?.extra !== null,
    last: columnLabels?.last !== null,
  };

  const tagIcon = iconName ??
    (title.toLowerCase().includes("loser") ? "trending-down" : "trending-up");
  const tableLabel = `${title} movers`;

  return (
    <Column gap="12" align="start">
      <Tag size="s" background={tone} prefixIcon={tagIcon}>
        {title}
      </Tag>
      <Column
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="l"
        fillWidth
      >
        {data.length === 0
          ? (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {emptyLabel}
            </Text>
          )
          : (
            <Table aria-label={tableLabel}>
              <TableCaption className="sr-only">
                {`${title} with change metrics and last price data.`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Instrument</TableHead>
                  {visibility.changePercent
                    ? (
                      <TableHead scope="col" className="text-right">
                        {labels.changePercent}
                      </TableHead>
                    )
                    : null}
                  {visibility.change
                    ? (
                      <TableHead scope="col" className="text-right">
                        {labels.change}
                      </TableHead>
                    )
                    : null}
                  {visibility.extra
                    ? (
                      <TableHead scope="col" className="text-right">
                        {labels.extra}
                      </TableHead>
                    )
                    : null}
                  {visibility.last
                    ? (
                      <TableHead scope="col" className="text-right">
                        {labels.last}
                      </TableHead>
                    )
                    : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Column gap="4" align="start">
                        <Text variant="body-strong-s">{item.label}</Text>
                        {item.symbol
                          ? (
                            <Text
                              variant="body-default-s"
                              onBackground="neutral-weak"
                            >
                              {item.symbol}
                            </Text>
                          )
                          : null}
                      </Column>
                    </TableCell>
                    {visibility.changePercent
                      ? (
                        <TableCell className="text-right">
                          <AsciiShaderText asChild intensity="bold">
                            <Text variant="body-strong-s">
                              {resolvedFormatters.changePercent(
                                item.changePercent,
                              )}
                            </Text>
                          </AsciiShaderText>
                        </TableCell>
                      )
                      : null}
                    {visibility.change
                      ? (
                        <TableCell className="text-right">
                          <AsciiShaderText asChild intensity="balanced">
                            <Text
                              variant="body-default-s"
                              onBackground="neutral-weak"
                            >
                              {resolvedFormatters.change(item.change)}
                            </Text>
                          </AsciiShaderText>
                        </TableCell>
                      )
                      : null}
                    {visibility.extra
                      ? (
                        <TableCell className="text-right">
                          <AsciiShaderText asChild intensity="balanced">
                            <Text
                              variant="body-default-s"
                              onBackground="neutral-weak"
                            >
                              {resolvedFormatters.extra(item.extra)}
                            </Text>
                          </AsciiShaderText>
                        </TableCell>
                      )
                      : null}
                    {visibility.last
                      ? (
                        <TableCell className="text-right">
                          <AsciiShaderText asChild intensity="bold">
                            <Text
                              variant="body-default-s"
                              onBackground="neutral-weak"
                            >
                              {resolvedFormatters.last(item.last)}
                            </Text>
                          </AsciiShaderText>
                        </TableCell>
                      )
                      : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Column>
    </Column>
  );
}

export interface VolatilityBucketEntry {
  id: string;
  label: string;
  symbol?: string;
  value?: number;
}

export interface VolatilityBucket {
  title: string;
  background: TagBackground;
  data: VolatilityBucketEntry[];
  formatValue?: (value: number | undefined) => string;
  valueLabel?: string;
  emptyLabel?: string;
}

const defaultVolatilityFormatter = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(2)}%`;
};

export function VolatilityBucketPanel({
  title,
  data,
  background,
  formatValue = defaultVolatilityFormatter,
  emptyLabel = "No instruments available.",
}: VolatilityBucket) {
  const headingId = `${
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  }-bucket-label`;

  return (
    <Column
      flex={1}
      minWidth={24}
      gap="12"
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      padding="l"
      align="start"
    >
      <Tag
        id={headingId}
        size="s"
        background={background}
        prefixIcon="activity"
      >
        {title}
      </Tag>
      <Column as="ul" gap="12" fillWidth aria-labelledby={headingId}>
        {data.length === 0
          ? (
            <Text as="li" variant="body-default-s" onBackground="neutral-weak">
              {emptyLabel}
            </Text>
          )
          : data.map((item) => (
            <Row key={item.id} as="li" horizontal="between" vertical="center">
              <Column gap="4">
                <Text variant="body-strong-s">{item.label}</Text>
                {item.symbol
                  ? (
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {item.symbol}
                    </Text>
                  )
                  : null}
              </Column>
              <Text variant="body-strong-s">{formatValue(item.value)}</Text>
            </Row>
          ))}
      </Column>
    </Column>
  );
}
