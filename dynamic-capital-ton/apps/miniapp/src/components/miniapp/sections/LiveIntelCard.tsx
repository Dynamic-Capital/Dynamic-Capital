"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Flex,
  Grid,
  Icon,
  Text,
} from "@once-ui-system/core";

import type { LiveIntelSnapshot } from "@/data/live-intel";

import {
  formatConfidence,
  formatRelativeTime,
  riskSeverity,
} from "../home/model";

export type LiveIntelCardProps = {
  status: "loading" | "ready" | "error";
  intel?: LiveIntelSnapshot;
  isSyncing: boolean;
  updatedAt?: string;
  countdown: number | null;
  error?: string;
  onRefresh: () => void;
};

export function LiveIntelCard({
  status,
  intel,
  isSyncing,
  updatedAt,
  countdown,
  error,
  onRefresh,
}: LiveIntelCardProps) {
  const confidenceLabel = formatConfidence(intel?.confidence);
  const alerts = intel?.alerts ?? [];
  const opportunities = intel?.opportunities ?? [];
  const risks = intel?.risks ?? [];

  return (
    <Card as="section" id="intel" background="surface" radius="xl" padding="xl" gap="l">
      <Flex direction="row" horizontal="between" vertical="center" wrap gap="m">
        <Column gap="s">
          <Text variant="code-strong-s" onBackground="brand-strong">
            Live desk intelligence
          </Text>
          <Text variant="heading-strong-l">
            Grok-1 briefs synchronized with DeepSeek-V2 arbitration
          </Text>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Stay aligned with the desk’s risk posture and opportunity radar in near real-time.
          </Text>
        </Column>
        <Column gap="s" horizontal="end" minWidth={220}>
          <Text variant="body-default-s" onBackground="neutral-weak" align="end">
            {isSyncing
              ? "Streaming latest insights…"
              : countdown !== null
              ? `Next sync in ${countdown}s`
              : updatedAt
              ? `Updated ${formatRelativeTime(updatedAt)}`
              : "Awaiting sync"}
          </Text>
          <Button
            variant="tertiary"
            size="s"
            onClick={onRefresh}
            loading={isSyncing}
            disabled={status === "loading" && isSyncing}
          >
            Refresh now
          </Button>
        </Column>
      </Flex>

      {error && status === "error" && (
        <Card background="brand-alpha-weak" radius="l" padding="m">
          <Column gap="s">
            <Text variant="body-strong-s">Unable to reach the intelligence feed right now.</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              We’ll retry automatically. You can also trigger a manual refresh.
            </Text>
            <Button variant="tertiary" size="s" onClick={onRefresh}>
              Retry now
            </Button>
          </Column>
        </Card>
      )}

      <Grid columns="2" gap="l" m={{ columns: "1" }}>
        <Card background="neutral-alpha-weak" radius="l" padding="l">
          <Column gap="m">
            <Flex direction="row" horizontal="between" vertical="center">
              <Text variant="body-strong-s">Narrative</Text>
              {confidenceLabel && (
                <Badge textVariant="body-default-xs" background="brand-alpha-weak" onBackground="brand-strong">
                  {confidenceLabel}
                </Badge>
              )}
            </Flex>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {intel?.narrative ?? "Live narrative will populate on the next sync."}
            </Text>
            {alerts.length > 0 && (
              <Column gap="xs">
                {alerts.map((alert) => (
                  <Flex key={alert} direction="row" gap="s" vertical="center">
                    <Icon name="activity" />
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {alert}
                    </Text>
                  </Flex>
                ))}
              </Column>
            )}
          </Column>
        </Card>

        <Column gap="m">
          <Card background="surface" border="neutral-alpha-medium" radius="l" padding="l">
            <Column gap="s">
              <Text variant="body-strong-s">Opportunities</Text>
              {opportunities.length > 0 ? (
                <Column gap="xs">
                  {opportunities.map((item) => (
                    <Flex key={item} direction="row" gap="s" vertical="center" wrap>
                      <Icon name="sparkles" />
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        {item}
                      </Text>
                    </Flex>
                  ))}
                </Column>
              ) : (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  No opportunities detected in the latest cycle.
                </Text>
              )}
            </Column>
          </Card>

          <Card background="surface" border="neutral-alpha-medium" radius="l" padding="l">
            <Column gap="s">
              <Text variant="body-strong-s">Risk scan</Text>
              {risks.length > 0 ? (
                <Column gap="xs">
                  {risks.map((item) => (
                    <Flex key={item} direction="row" gap="s" vertical="center" wrap>
                      <Icon name="activity" />
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        {item}
                      </Text>
                    </Flex>
                  ))}
                </Column>
              ) : (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  No immediate risks flagged by the desk.
                </Text>
              )}
            </Column>
          </Card>
        </Column>
      </Grid>
    </Card>
  );
}
