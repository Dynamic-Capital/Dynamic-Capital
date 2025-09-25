"use client";

import { Fragment } from "react";

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

type TagBackground = Colors | "page" | "surface" | "overlay" | "transparent";

type ImpactStyle = { label: string; background: TagBackground; icon: string };

const IMPACT_STYLES: Record<ImpactLevel, ImpactStyle> = {
  High: {
    label: "High impact",
    background: "danger-alpha-weak",
    icon: "alert-triangle",
  },
  Medium: {
    label: "Medium impact",
    background: "brand-alpha-weak",
    icon: "activity",
  },
  Low: { label: "Low impact", background: "neutral-alpha-weak", icon: "info" },
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
                <Icon name="activity" onBackground="brand-medium" />
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
              background="danger-alpha-weak"
              border="danger-alpha-medium"
              radius="l"
              padding="l"
              gap="16"
            >
              <Row gap="12" vertical="center">
                <Icon name="alert-triangle" onBackground="danger-strong" />
                <Text variant="body-strong-m" onBackground="danger-strong">
                  Economic calendar temporarily unavailable
                </Text>
              </Row>
              <Text variant="body-default-m" onBackground="danger-strong">
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
                            background={impactDetails.background}
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
                      {event.marketFocus.length > 0
                        ? (
                          <Column gap="8">
                            <Text
                              variant="body-strong-s"
                              onBackground="neutral-strong"
                            >
                              Market focus
                            </Text>
                            <Row gap="8" wrap>
                              {event.marketFocus.map((focus) => (
                                <Tag
                                  key={focus}
                                  size="s"
                                  background="brand-alpha-weak"
                                  prefixIcon="target"
                                >
                                  {focus}
                                </Tag>
                              ))}
                            </Row>
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
                                  onBackground="brand-medium"
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
                <Icon name="sparkles" onBackground="brand-medium" />
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
