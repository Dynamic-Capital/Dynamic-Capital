"use client";

import { type CSSProperties, Fragment } from "react";

import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { useEconomicCalendar } from "@/hooks/useEconomicCalendar";
import type { EconomicEvent, ImpactLevel } from "@/types/economic-event";
import type { Colors } from "@/components/dynamic-ui-system";
import {
  balanceIconColor,
  balanceTextColor,
  type BalanceTone,
  balanceToneClass,
} from "@/utils/balancePalette";

type TagBackground = Colors | "page" | "surface" | "overlay" | "transparent";

type ImpactStyle = {
  label: string;
  icon: string;
  tone?: BalanceTone;
  fallbackBackground?: TagBackground;
};

const IMPACT_STYLES: Record<ImpactLevel, ImpactStyle> = {
  High: {
    label: "High impact",
    icon: "alert-triangle",
    tone: "bearish",
  },
  Medium: {
    label: "Medium impact",
    icon: "activity",
    tone: "premium",
  },
  Low: {
    label: "Low impact",
    icon: "info",
    fallbackBackground: "neutral-alpha-weak",
  },
};

const NUMBER_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

const formatNumber = (
  value: number | undefined,
  options: Intl.NumberFormatOptions,
) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const key = JSON.stringify(options);
  let formatter = NUMBER_FORMATTER_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", options);
    NUMBER_FORMATTER_CACHE.set(key, formatter);
  }

  return formatter.format(value);
};

const formatChangePercent = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const absolute = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${absolute}%`;
  }
  if (value < 0) {
    return `-${absolute}%`;
  }
  return `${absolute}%`;
};

const toneTextStyle = (tone: BalanceTone): CSSProperties => ({
  color: balanceTextColor(tone),
});

const toneIconStyle = (tone: BalanceTone): CSSProperties => ({
  color: balanceIconColor(tone),
});

type ChangeToneStyle = {
  tone?: BalanceTone;
  fallbackBackground?: TagBackground;
};

const resolveChangeTone = (value?: number): ChangeToneStyle => {
  if (value === undefined || Number.isNaN(value) || value === 0) {
    return { fallbackBackground: "neutral-alpha-weak" };
  }
  if (value > 0) {
    return { tone: "bullish" };
  }
  return { tone: "bearish" };
};

const resolveChangeIcon = (value?: number): string | undefined => {
  if (value === undefined || Number.isNaN(value) || value === 0) {
    return undefined;
  }
  return value > 0 ? "trending-up" : "trending-down";
};

interface EconomicCalendarSectionProps {
  events?: EconomicEvent[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function EconomicCalendarSection(
  props: EconomicCalendarSectionProps,
) {
  const hookEnabled = props.events === undefined &&
    props.loading === undefined &&
    props.error === undefined;

  const {
    events: hookEvents,
    loading: hookLoading,
    error: hookError,
    refresh,
  } = useEconomicCalendar({ enabled: hookEnabled });

  const events = props.events ?? hookEvents;
  const loading = props.loading ?? hookLoading;
  const error = props.error ?? hookError;
  const handleRetry = props.onRetry ?? (() => refresh(true));

  const hasEvents = events.length > 0;
  const showError = Boolean(error) && !loading;
  const showEmptyState = !loading && !showError && !hasEvents;

  return (
    <Column
      id="economic-calendar"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">
          Upcoming economic catalysts
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          The desk tracks macro releases that can reprice risk within minutes.
          Each listing includes the positioning gameplan so you know how we
          manage exposure into and out of the data.
        </Text>
      </Column>
      <Column gap="24">
        {loading
          ? (
            <Column
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="12"
            >
              <Row gap="12" vertical="center">
                <Icon name="activity" style={toneIconStyle("premium")} />
                <Text variant="body-strong-m">Loading upcoming catalysts…</Text>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                We’re syncing the latest releases and desk plans. This usually
                takes just a moment.
              </Text>
            </Column>
          )
          : null}
        {showError
          ? (
            <Column
              className={balanceToneClass("bearish")}
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="16"
            >
              <Row gap="12" vertical="center">
                <Icon name="alert-triangle" data-balance-icon />
                <Text
                  variant="body-strong-m"
                  style={toneTextStyle("bearish")}
                >
                  Economic calendar temporarily unavailable
                </Text>
              </Row>
              <Text
                variant="body-default-m"
                style={toneTextStyle("bearish")}
              >
                {error}
              </Text>
              <Row gap="12" wrap>
                <Button variant="secondary" onClick={handleRetry}>
                  Retry
                </Button>
              </Row>
            </Column>
          )
          : null}
        {hasEvents
          ? events.map((event, index) => {
            const impactDetails = IMPACT_STYLES[event.impact] ??
              IMPACT_STYLES.Medium;
            const showDeskPlan = event.deskPlan.length > 0;
            const focusHighlights = event.marketHighlights.length > 0
              ? event.marketHighlights
              : event.marketFocus.map((focus) => ({
                focus,
                instruments: [],
              }));

            return (
              <Fragment key={event.id}>
                <Column
                  background="page"
                  border="neutral-alpha-weak"
                  radius="l"
                  padding="l"
                  gap="20"
                >
                  <Row
                    gap="24"
                    vertical="start"
                    s={{ direction: "column", align: "start", gap: "16" }}
                  >
                    <Column gap="16" maxWidth={40}>
                      <Column gap="8">
                        <Row gap="8" wrap>
                          <Tag
                            size="s"
                            background="neutral-alpha-weak"
                            prefixIcon="calendar"
                          >
                            {event.day}
                          </Tag>
                          <Tag
                            size="s"
                            background="neutral-alpha-weak"
                            prefixIcon="clock"
                          >
                            {event.time}
                          </Tag>
                        </Row>
                        <Row gap="8" wrap vertical="center">
                          <Heading variant="heading-strong-m">
                            {event.title}
                          </Heading>
                          <Tag
                            size="s"
                            className={impactDetails.tone
                              ? balanceToneClass(impactDetails.tone)
                              : undefined}
                            background={impactDetails.fallbackBackground}
                            prefixIcon={impactDetails.icon}
                          >
                            {impactDetails.label}
                          </Tag>
                        </Row>
                      </Column>
                      <Text
                        variant="body-default-m"
                        onBackground="neutral-weak"
                      >
                        {event.commentary}
                      </Text>
                      {focusHighlights.length > 0
                        ? (
                          <Column gap="8">
                            <Text
                              variant="body-strong-s"
                              onBackground="neutral-strong"
                            >
                              Market focus
                            </Text>
                            <Column gap="8">
                              {focusHighlights.map((highlight) => {
                                const hasData =
                                  highlight.instruments.length > 0;
                                return (
                                  <Row
                                    key={highlight.focus}
                                    gap="8"
                                    wrap
                                    vertical="center"
                                  >
                                    <Tag
                                      size="s"
                                      className={balanceToneClass("premium")}
                                      prefixIcon="target"
                                    >
                                      {highlight.focus}
                                    </Tag>
                                    {hasData
                                      ? highlight.instruments.map(
                                        (instrument) => {
                                          const priceLabel = formatNumber(
                                            instrument.last,
                                            instrument.format,
                                          );
                                          const changeLabel =
                                            formatChangePercent(
                                              instrument.changePercent,
                                            );
                                          const changeToneStyle =
                                            resolveChangeTone(
                                              instrument.changePercent,
                                            );
                                          const changeToneClass =
                                            changeToneStyle.tone
                                              ? balanceToneClass(
                                                changeToneStyle.tone,
                                              )
                                              : undefined;
                                          const changeBackground =
                                            changeToneStyle.fallbackBackground;
                                          const changeIcon = resolveChangeIcon(
                                            instrument.changePercent,
                                          );
                                          return (
                                            <Row
                                              key={`${highlight.focus}-${instrument.instrumentId}`}
                                              gap="8"
                                              wrap
                                              vertical="center"
                                            >
                                              <Tag
                                                size="s"
                                                background="neutral-alpha-weak"
                                              >
                                                {instrument.displaySymbol}
                                              </Tag>
                                              <Tag
                                                size="s"
                                                background="neutral-alpha-weak"
                                              >
                                                {priceLabel}
                                              </Tag>
                                              <Tag
                                                size="s"
                                                className={changeToneClass}
                                                background={changeBackground}
                                                prefixIcon={changeIcon}
                                              >
                                                {changeLabel}
                                              </Tag>
                                            </Row>
                                          );
                                        },
                                      )
                                      : null}
                                  </Row>
                                );
                              })}
                            </Column>
                          </Column>
                        )
                        : null}
                    </Column>
                    <Column gap="12" as="section">
                      <Text
                        variant="body-strong-s"
                        onBackground="neutral-strong"
                      >
                        Desk plan
                      </Text>
                      {showDeskPlan
                        ? (
                          <Column as="ul" gap="12">
                            {event.deskPlan.map((plan, planIndex) => (
                              <Row key={planIndex} gap="8" vertical="start">
                                <Icon
                                  name="sparkles"
                                  style={toneIconStyle("premium")}
                                />
                                <Text as="li" variant="body-default-m">
                                  {plan}
                                </Text>
                              </Row>
                            ))}
                          </Column>
                        )
                        : (
                          <Text
                            variant="body-default-m"
                            onBackground="neutral-weak"
                          >
                            Trading desk notes will publish as the event
                            approaches.
                          </Text>
                        )}
                    </Column>
                  </Row>
                </Column>
                {index < events.length - 1
                  ? <Line background="neutral-alpha-weak" />
                  : null}
              </Fragment>
            );
          })
          : null}
        {showEmptyState
          ? (
            <Column
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="12"
            >
              <Row gap="12" vertical="center">
                <Icon name="sparkles" style={toneIconStyle("premium")} />
                <Text variant="body-strong-m">
                  Desk is preparing new catalysts
                </Text>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                We couldn’t find upcoming events right now. Check back shortly
                as the desk syncs new releases.
              </Text>
            </Column>
          )
          : null}
      </Column>
    </Column>
  );
}

export default EconomicCalendarSection;
