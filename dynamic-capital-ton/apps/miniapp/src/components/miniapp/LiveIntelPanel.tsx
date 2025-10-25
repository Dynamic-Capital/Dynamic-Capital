"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Heading,
  List,
  Row,
  StatusIndicator,
  Text,
} from "@once-ui-system/core";
import type { CSSProperties } from "react";

import type { LiveIntelSnapshot } from "@/data/live-intel";

const EMPTY_MESSAGE = "No data available right now.";

const TIMELINE_TONE = {
  complete: {
    label: "Completed",
    indicator: "green" as const,
    badge: { background: "success-alpha-weak", onBackground: "success-strong" },
  },
  pending: {
    label: "Pending",
    indicator: "cyan" as const,
    badge: { background: "brand-alpha-weak", onBackground: "brand-strong" },
  },
  upcoming: {
    label: "Upcoming",
    indicator: "gray" as const,
    badge: { background: "neutral-alpha-weak", onBackground: "neutral-strong" },
  },
} as const;

const SECTION_TONES = {
  opportunities: {
    badge: { background: "accent-alpha-weak", onBackground: "accent-strong" },
  },
  risks: {
    badge: { background: "danger-alpha-weak", onBackground: "danger-strong" },
  },
  actions: {
    badge: { background: "brand-alpha-weak", onBackground: "brand-strong" },
  },
} as const;

type LiveIntelPanelProps = {
  snapshot: LiveIntelSnapshot;
  walletVerified: boolean;
  designTokens: Record<string, string>;
  nextUpdateInSeconds: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  error?: string | null;
};

type NormalizedMetric = {
  id: string;
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "steady";
};

type NormalizedTimelineEntry = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: "complete" | "pending" | "upcoming";
};

type NormalizedModel = {
  id: string;
  name: string;
  focus: string;
  summary: string;
  highlights: string[];
  riskScore?: number;
};

function readDesignToken(
  designTokens: Record<string, string>,
  keys: readonly string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = designTokens[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry): entry is string => entry.length > 0);
}

function normalizeMetrics(value: unknown): NormalizedMetric[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as {
        label?: unknown;
        value?: unknown;
        change?: unknown;
        trend?: unknown;
      };
      const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
      const metricValue =
        typeof candidate.value === "string" ? candidate.value.trim() : "";
      if (!label || !metricValue) {
        return null;
      }
      const change =
        typeof candidate.change === "string" && candidate.change.trim().length > 0
          ? candidate.change.trim()
          : undefined;
      const trend =
        candidate.trend === "up" || candidate.trend === "down" || candidate.trend === "steady"
          ? candidate.trend
          : undefined;
      return {
        id: `${label}-${index}`,
        label,
        value: metricValue,
        change,
        trend,
      } satisfies NormalizedMetric;
    })
    .filter((metric): metric is NormalizedMetric => metric !== null);
}

function normalizeTimeline(value: unknown): NormalizedTimelineEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as {
        title?: unknown;
        status?: unknown;
        timestamp?: unknown;
        description?: unknown;
      };
      const title =
        typeof candidate.title === "string" && candidate.title.trim().length > 0
          ? candidate.title.trim()
          : "Desk update pending";
      const description =
        typeof candidate.description === "string" && candidate.description.trim().length > 0
          ? candidate.description.trim()
          : "Details will follow shortly.";
      const timestamp =
        typeof candidate.timestamp === "string" && candidate.timestamp.trim().length > 0
          ? candidate.timestamp.trim()
          : "Pending";
      const rawStatus =
        typeof candidate.status === "string" ? candidate.status.trim().toLowerCase() : "";
      const status: NormalizedTimelineEntry["status"] = rawStatus === "complete"
        ? "complete"
        : rawStatus === "upcoming"
        ? "upcoming"
        : "pending";
      return {
        id: `${title}-${timestamp}-${index}`,
        title,
        description,
        timestamp,
        status,
      } satisfies NormalizedTimelineEntry;
    })
    .filter((entry): entry is NormalizedTimelineEntry => entry !== null);
}

function normalizeModels(value: unknown): NormalizedModel[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return entries
    .map(([key, item], index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as {
        model?: unknown;
        focus?: unknown;
        summary?: unknown;
        highlights?: unknown;
        riskScore?: unknown;
      };
      const modelName =
        typeof candidate.model === "string" && candidate.model.trim().length > 0
          ? candidate.model.trim()
          : key;
      const focus =
        typeof candidate.focus === "string" && candidate.focus.trim().length > 0
          ? candidate.focus.trim()
          : "Focus updating";
      const summary =
        typeof candidate.summary === "string" && candidate.summary.trim().length > 0
          ? candidate.summary.trim()
          : "Desk is preparing the latest model insight.";
      const highlights = ensureStringArray(candidate.highlights);
      const riskScore =
        typeof candidate.riskScore === "number" && Number.isFinite(candidate.riskScore)
          ? Math.min(1, Math.max(0, candidate.riskScore))
          : undefined;
      if (!summary && highlights.length === 0) {
        return null;
      }
      return {
        id: `${modelName}-${index}`,
        name: modelName.toUpperCase(),
        focus,
        summary: summary || "Model insight pending additional data.",
        highlights,
        riskScore,
      } satisfies NormalizedModel;
    })
    .filter((entry): entry is NormalizedModel => entry !== null);
}

function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return "Timestamp unavailable";
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  } catch (error) {
    console.warn("[miniapp] Failed to format live intel timestamp", error);
    return parsed.toISOString();
  }
}

function formatCountdown(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) {
    return null;
  }
  const clamped = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  const minuteLabel = minutes > 0 ? `${minutes}m` : null;
  const secondLabel = `${remainder.toString().padStart(2, "0")}s`;
  return minuteLabel ? `${minuteLabel} ${secondLabel}` : secondLabel;
}

function resolvePanelStyle(designTokens: Record<string, string>): CSSProperties {
  const sheen = readDesignToken(
    designTokens,
    ["--once-glow-accent", "--once-glow-strong"],
    "rgba(56, 189, 248, 0.18)",
  );
  const surface = readDesignToken(
    designTokens,
    ["--once-surface-overlay", "--once-surface-glass"],
    "rgba(15, 23, 42, 0.86)",
  );
  const border = readDesignToken(
    designTokens,
    ["--once-border-strong", "--once-border-medium"],
    "rgba(148, 163, 184, 0.35)",
  );
  return {
    backgroundImage: `linear-gradient(140deg, ${sheen} 0%, ${surface} 58%, rgba(4,9,18,0.92) 100%)`,
    border: `1px solid ${border}`,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.45)",
  } satisfies CSSProperties;
}

function metricTrendLabel(metric: NormalizedMetric): string | null {
  if (!metric.change && !metric.trend) {
    return null;
  }
  const symbol = metric.trend === "down" ? "▼" : metric.trend === "up" ? "▲" : "•";
  return `${symbol} ${metric.change ?? "Stable"}`;
}

function trendTone(trend: NormalizedMetric["trend"]): string {
  switch (trend) {
    case "up":
      return "success-strong";
    case "down":
      return "danger-strong";
    default:
      return "neutral-medium";
  }
}

type ItemsSectionTone = keyof typeof SECTION_TONES;

type ItemsSectionProps = {
  title: string;
  items: string[];
  tone: ItemsSectionTone;
  walletVerified: boolean;
  gated?: boolean;
  bulletColor: string;
};

function ItemsSection({
  title,
  items,
  tone,
  walletVerified,
  gated = false,
  bulletColor,
}: ItemsSectionProps) {
  const toneSpec = SECTION_TONES[tone];
  const hasItems = items.length > 0;
  const content = hasItems
    ? (
      <List as="ul" gap="8">
        {items.map((item, index) => (
          <Row as="li" key={`${item}-${index}`} gap="8" vertical="start" horizontal="start">
            <ListBullet color={bulletColor} />
            <Text variant="body-default-m" onBackground="neutral-strong">
              {item}
            </Text>
          </Row>
        ))}
      </List>
    )
    : (
      <Text variant="label-default-s" onBackground="neutral-medium">
        {EMPTY_MESSAGE}
      </Text>
    );

  const body = gated && !walletVerified
    ? (
      <Column gap="12" align="center" style={{ textAlign: "center" }}>
        <Text variant="label-strong-m" onBackground="neutral-strong">
          Desk exclusive
        </Text>
        <Text variant="body-default-m" onBackground="neutral-strong">
          Link your TON wallet to unlock desk-ready actions.
        </Text>
      </Column>
    )
    : content;

  return (
    <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium">
      <Column gap="16">
        <Row horizontal="between" vertical="center" wrap gap="12">
          <Badge effect={false} background={toneSpec.badge.background} onBackground={toneSpec.badge.onBackground}>
            <Text variant="label-strong-s" onBackground={toneSpec.badge.onBackground}>
              {title}
            </Text>
          </Badge>
          {gated && (
            <Badge
              effect={false}
              background={walletVerified ? "success-alpha-weak" : "neutral-alpha-weak"}
              onBackground={walletVerified ? "success-strong" : "neutral-strong"}
            >
              <Text
                variant="label-strong-s"
                onBackground={walletVerified ? "success-strong" : "neutral-strong"}
              >
                {walletVerified ? "Unlocked" : "Requires verification"}
              </Text>
            </Badge>
          )}
        </Row>
        {body}
      </Column>
    </Card>
  );
}

type TimelineSectionProps = {
  entries: NormalizedTimelineEntry[];
};

function TimelineSection({ entries }: TimelineSectionProps) {
  if (!entries.length) {
    return null;
  }

  return (
    <Column gap="16">
      <Heading as="h3" variant="display-strong-xs">
        Desk timeline
      </Heading>
      <Column as="ul" gap="12">
        {entries.map((entry) => {
          const tone = TIMELINE_TONE[entry.status];
          return (
            <Card
              key={entry.id}
              as="li"
              padding="20"
              radius="xl"
              background="transparent"
              border="neutral-alpha-medium"
            >
              <Row horizontal="between" vertical="start" wrap gap="12">
                <Row gap="12" vertical="center">
                  <StatusIndicator
                    size="s"
                    color={tone.indicator}
                    ariaLabel={`${tone.label} update`}
                  />
                  <Column gap="4">
                    <Text variant="label-strong-m">
                      {entry.title}
                    </Text>
                    <Text variant="body-default-m" onBackground="neutral-strong">
                      {entry.description}
                    </Text>
                  </Column>
                </Row>
                <Column align="end" gap="8" minWidth={16}>
                  <Badge
                    effect={false}
                    background={tone.badge.background}
                    onBackground={tone.badge.onBackground}
                  >
                    <Text variant="label-strong-s" onBackground={tone.badge.onBackground}>
                      {tone.label}
                    </Text>
                  </Badge>
                  <Text variant="label-default-s" onBackground="neutral-medium">
                    {entry.timestamp}
                  </Text>
                </Column>
              </Row>
            </Card>
          );
        })}
      </Column>
    </Column>
  );
}

type MetricsSectionProps = {
  metrics: NormalizedMetric[];
};

function MetricsSection({ metrics }: MetricsSectionProps) {
  if (!metrics.length) {
    return null;
  }

  return (
    <Column gap="16">
      <Heading as="h3" variant="display-strong-xs">
        Key metrics
      </Heading>
      <Row wrap gap="16">
        {metrics.map((metric) => {
          const trendLabel = metricTrendLabel(metric);
          return (
            <Card
              key={metric.id}
              padding="20"
              radius="xl"
              background="surface"
              border="neutral-alpha-medium"
              style={{ minWidth: "min(220px, 100%)" }}
            >
              <Column gap="8">
                <Text variant="label-default-s" onBackground="neutral-medium">
                  {metric.label}
                </Text>
                <Text variant="display-strong-xs">
                  {metric.value}
                </Text>
                {trendLabel && (
                  <Text variant="label-strong-s" onBackground={trendTone(metric.trend)}>
                    {trendLabel}
                  </Text>
                )}
              </Column>
            </Card>
          );
        })}
      </Row>
    </Column>
  );
}

type ModelsSectionProps = {
  models: NormalizedModel[];
  bulletColor: string;
};

function ModelsSection({ models, bulletColor }: ModelsSectionProps) {
  if (!models.length) {
    return null;
  }

  return (
    <Column gap="16">
      <Heading as="h3" variant="display-strong-xs">
        Model insights
      </Heading>
      <Row wrap gap="16">
        {models.map((model) => (
          <Card
            key={model.id}
            padding="24"
            radius="xl"
            background="surface"
            border="neutral-alpha-medium"
            style={{ minWidth: "min(280px, 100%)" }}
          >
            <Column gap="12">
              <Row horizontal="between" vertical="center" wrap gap="12">
                <Badge effect={false} background="neutral-alpha-weak" onBackground="neutral-strong">
                  <Text variant="label-strong-s" onBackground="neutral-strong">
                    {model.name}
                  </Text>
                </Badge>
                {typeof model.riskScore === "number" && (
                  <Badge effect={false} background="danger-alpha-weak" onBackground="danger-strong">
                    <Text variant="label-strong-s" onBackground="danger-strong">
                      Risk {Math.round(model.riskScore * 100)}%
                    </Text>
                  </Badge>
                )}
              </Row>
              <Text variant="label-default-s" onBackground="neutral-medium">
                {model.focus}
              </Text>
              <Text variant="body-default-m" onBackground="neutral-strong">
                {model.summary}
              </Text>
              {model.highlights.length > 0 && (
                <List as="ul" gap="8">
                  {model.highlights.map((highlight, index) => (
                    <Row as="li" key={`${model.id}-highlight-${index}`} gap="8" vertical="start" horizontal="start">
                      <ListBullet color={bulletColor} />
                      <Text variant="label-default-s" onBackground="neutral-medium">
                        {highlight}
                      </Text>
                    </Row>
                  ))}
                </List>
              )}
            </Column>
          </Card>
        ))}
      </Row>
    </Column>
  );
}

type AlertsSectionProps = {
  alerts: string[];
  bulletColor: string;
};

function AlertsSection({ alerts, bulletColor }: AlertsSectionProps) {
  if (!alerts.length) {
    return null;
  }

  return (
    <Card
      padding="24"
      radius="xl"
      background="danger-alpha-weak"
      border="danger-alpha-medium"
    >
      <Column gap="16">
        <Row horizontal="between" vertical="center" wrap gap="12">
          <Badge effect={false} background="danger-alpha-weak" onBackground="danger-strong">
            <Text variant="label-strong-s" onBackground="danger-strong">
              Alerts
            </Text>
          </Badge>
          <StatusIndicator size="s" color="yellow" ariaLabel="Active alert" />
        </Row>
        <List as="ul" gap="8">
          {alerts.map((alert, index) => (
            <Row as="li" key={`${alert}-${index}`} gap="8" vertical="start" horizontal="start">
              <ListBullet color={bulletColor} />
              <Text variant="body-default-m" onBackground="danger-strong">
                {alert}
              </Text>
            </Row>
          ))}
        </List>
      </Column>
    </Card>
  );
}

type ListBulletProps = {
  color: string;
};

function ListBullet({ color }: ListBulletProps) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        width: "0.5rem",
        height: "0.5rem",
        borderRadius: "9999px",
        backgroundColor: color,
        flexShrink: 0,
        marginTop: "0.35rem",
      }}
    />
  );
}

export function LiveIntelPanel({
  snapshot,
  walletVerified,
  designTokens,
  nextUpdateInSeconds,
  refreshing,
  onRefresh,
  error,
}: LiveIntelPanelProps) {
  const data = snapshot as Partial<LiveIntelSnapshot> & Record<string, unknown>;
  const alerts = ensureStringArray(data.alerts);
  const metrics = normalizeMetrics(data.metrics);
  const timeline = normalizeTimeline(data.timeline);
  const opportunities = ensureStringArray(data.opportunities);
  const risks = ensureStringArray(data.risks);
  const recommendedActions = ensureStringArray(data.recommendedActions);
  const models = normalizeModels(data.models);
  const timestampSource = typeof data.timestamp === "string" ? data.timestamp : null;
  const confidenceValue =
    typeof data.confidence === "number" && Number.isFinite(data.confidence)
      ? Math.min(1, Math.max(0, data.confidence))
      : null;
  const narrativeSource = typeof data.narrative === "string" ? data.narrative.trim() : "";

  const accentColor = readDesignToken(
    designTokens,
    ["--once-color-accent", "--once-color-brand", "--accent"],
    "#38bdf8",
  );
  const warningColor = readDesignToken(
    designTokens,
    ["--once-color-warning", "--warning"],
    "#f97316",
  );
  const dangerColor = readDesignToken(
    designTokens,
    ["--once-color-danger", "--danger"],
    "#fb7185",
  );
  const panelStyle = resolvePanelStyle(designTokens);
  const formattedTimestamp = formatTimestamp(timestampSource);
  const confidenceLabel = confidenceValue !== null
    ? `${Math.round(confidenceValue * 100)}% confidence`
    : null;
  const countdownLabel = formatCountdown(nextUpdateInSeconds);
  const narrative = narrativeSource || "Live intel update";
  const errorMessage =
    typeof error === "string" && error.trim().length > 0 ? error.trim() : null;

  return (
    <Card
      as="aside"
      padding="32"
      radius="xl"
      gap="24"
      background="transparent"
      border="transparent"
      style={panelStyle}
    >
      <Column gap="24">
        <Row horizontal="between" vertical="start" wrap gap="16">
          <Column gap="12" flex={1} minWidth={24}>
            <Badge effect={false} background="accent-alpha-weak" onBackground="accent-strong">
              <Text variant="label-strong-s" onBackground="accent-strong">
                Live intel snapshot
              </Text>
            </Badge>
            <Heading as="h2" variant="display-strong-xs">
              {narrative}
            </Heading>
          </Column>
          <Column gap="12" align="end" minWidth={16}>
            <Row gap="8" wrap horizontal="end" vertical="center">
              {countdownLabel && (
                <Badge
                  effect={false}
                  background="neutral-alpha-weak"
                  onBackground="neutral-strong"
                  style={{ border: `1px solid ${accentColor}` }}
                >
                  <Text variant="label-strong-s" onBackground="neutral-strong">
                    Next update in {countdownLabel}
                  </Text>
                </Badge>
              )}
              <Button
                type="button"
                variant="tertiary"
                size="s"
                onClick={onRefresh}
                disabled={refreshing}
                label={refreshing ? "Refreshing…" : "Refresh"}
              />
              <Badge
                effect={false}
                background={walletVerified ? "success-alpha-weak" : "neutral-alpha-weak"}
                onBackground={walletVerified ? "success-strong" : "neutral-strong"}
              >
                <Text
                  variant="label-strong-s"
                  onBackground={walletVerified ? "success-strong" : "neutral-strong"}
                >
                  {walletVerified ? "Desk linked" : "Preview mode"}
                </Text>
              </Badge>
            </Row>
          </Column>
        </Row>

        <Row gap="12" wrap vertical="center" horizontal="start">
          <StatusIndicator size="s" color="cyan" ariaLabel="Intel timestamp" />
          <Text variant="label-default-s" onBackground="neutral-medium">
            {formattedTimestamp}
          </Text>
          {confidenceLabel && (
            <Badge effect={false} background="accent-alpha-weak" onBackground="accent-strong">
              <Text variant="label-strong-s" onBackground="accent-strong">
                {confidenceLabel}
              </Text>
            </Badge>
          )}
        </Row>

        {errorMessage && (
          <Card
            padding="16"
            radius="l"
            background="danger-alpha-weak"
            border="danger-alpha-medium"
          >
            <Text variant="label-default-s" onBackground="danger-strong">
              {errorMessage}
            </Text>
          </Card>
        )}

        <AlertsSection alerts={alerts} bulletColor={dangerColor} />

        <MetricsSection metrics={metrics} />

        <TimelineSection entries={timeline} />

        <ModelsSection models={models} bulletColor={accentColor} />

        <Row wrap gap="16">
          <Column flex={1} minWidth={24}>
            <ItemsSection
              title="Opportunities"
              items={opportunities}
              tone="opportunities"
              walletVerified={walletVerified}
              bulletColor={accentColor}
            />
          </Column>
          <Column flex={1} minWidth={24}>
            <ItemsSection
              title="Risks"
              items={risks}
              tone="risks"
              walletVerified={walletVerified}
              bulletColor={warningColor}
            />
          </Column>
        </Row>

        <ItemsSection
          title="Recommended actions"
          items={recommendedActions}
          tone="actions"
          walletVerified={walletVerified}
          gated
          bulletColor={accentColor}
        />
      </Column>
    </Card>
  );
}

export default LiveIntelPanel;
