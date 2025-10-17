"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Heading,
  Row,
  Text,
  type Colors,
} from "@once-ui-system/core";
import type { ReactNode } from "react";

import type { LiveMetric } from "@/data/live-intel";

import { SyncBanner } from "./SyncBanner";

type HeroMetric = LiveMetric;

type TonProofVariant = "info" | "loading" | "error" | "success";

type TonProofStatus = {
  variant: TonProofVariant;
  title: string;
  description?: string | null;
  showRetry: boolean;
  retryDisabled: boolean;
};

type HeroPlanSummary = {
  name: string;
  price?: string;
  cadence?: string;
  amountAvailable?: boolean;
};

type HeroSectionProps = {
  syncDescription: string;
  syncCountdown: number | null;
  syncDisabled?: boolean;
  isSyncing: boolean;
  onSyncRefresh: () => void;
  metrics: readonly HeroMetric[];
  eyebrow: string;
  title: string;
  subtitle: string;
  tonConnectButton: ReactNode;
  walletButtonLabel: string;
  onWalletButtonPress: () => void;
  walletButtonDisabled?: boolean;
  tonProofStatus: TonProofStatus;
  onTonProofRetry?: () => void;
  planTagline?: string | null;
  walletLabel: string;
  telegramLabel: string;
  planStatusLabel: string;
  planStatusTone?: "default" | "error";
  liveFeedLabel: string;
  selectedPlan?: HeroPlanSummary | null;
};

function metricTrendColor(trend?: HeroMetric["trend"]): Colors {
  switch (trend) {
    case "up":
      return "success-strong";
    case "down":
      return "danger-strong";
    default:
      return "neutral-strong";
  }
}

function MetricTiles({ metrics }: { metrics: readonly HeroMetric[] }) {
  if (!metrics.length) {
    return null;
  }

  return (
    <Row gap="12" wrap>
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          padding="20"
          radius="l"
          background="surface"
          border="transparent"
          style={{ minWidth: "min(180px, 100%)" }}
        >
          <Column gap="4">
            <Text variant="label-strong-s" onBackground="neutral-medium">
              {metric.label}
            </Text>
            <Text variant="display-strong-s">
              {metric.value}
            </Text>
            {metric.change && (
              <Text
                variant="label-strong-s"
                onBackground={metricTrendColor(metric.trend)}
                aria-label={`${metric.trend ?? "steady"} ${metric.change}`}
              >
                {metric.trend === "down"
                  ? "▼"
                  : metric.trend === "up"
                  ? "▲"
                  : "•"}{" "}
                {metric.change}
              </Text>
            )}
          </Column>
        </Card>
      ))}
    </Row>
  );
}

function resolveProofColors(variant: TonProofVariant): {
  background: Colors;
  border: Colors;
  text: Colors;
} {
  switch (variant) {
    case "success":
      return {
        background: "success-alpha-weak",
        border: "success-alpha-medium",
        text: "success-strong",
      };
    case "error":
      return {
        background: "danger-alpha-weak",
        border: "danger-alpha-medium",
        text: "danger-strong",
      };
    case "loading":
      return {
        background: "brand-alpha-weak",
        border: "brand-alpha-medium",
        text: "brand-strong",
      };
    default:
      return {
        background: "neutral-alpha-weak",
        border: "neutral-alpha-medium",
        text: "neutral-strong",
      };
  }
}

export function HeroSection({
  syncDescription,
  syncCountdown,
  syncDisabled,
  isSyncing,
  onSyncRefresh,
  metrics,
  eyebrow,
  title,
  subtitle,
  tonConnectButton,
  walletButtonLabel,
  onWalletButtonPress,
  walletButtonDisabled,
  tonProofStatus,
  onTonProofRetry,
  planTagline,
  walletLabel,
  telegramLabel,
  planStatusLabel,
  planStatusTone = "default",
  liveFeedLabel,
  selectedPlan,
}: HeroSectionProps) {
  const proofColors = resolveProofColors(tonProofStatus.variant);

  return (
    <Card
      as="section"
      id="overview"
      padding="32"
      radius="xl"
      gap="24"
      background="transparent"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, var(--ui-sheen, rgba(58,165,255,0.28)), var(--ui-surface, rgba(18,33,71,0.85)) 58%, rgba(6,9,18,0.9))",
        boxShadow: "0 22px 48px var(--ui-shadow, rgba(15, 23, 42, 0.35))",
      }}
      border="accent-strong"
    >
      <Column gap="24">
        <SyncBanner
          description={syncDescription}
          isSyncing={isSyncing}
          countdown={syncCountdown}
          onRefresh={onSyncRefresh}
          disabled={syncDisabled}
        />

        <Row wrap gap="24" horizontal="between">
          <Column gap="12" flex={1} minWidth={20}>
            <Text variant="label-strong-s" style={{ letterSpacing: "0.22em" }}>
              {eyebrow}
            </Text>
            <Heading as="h1" variant="display-strong-s">
              {title}
            </Heading>
            <Text variant="body-default-l" onBackground="neutral-strong">
              {subtitle}
            </Text>
          </Column>
          <MetricTiles metrics={metrics} />
        </Row>

        <Row gap="12" wrap>
          {tonConnectButton}
          <Button
            type="button"
            variant={walletButtonDisabled ? "secondary" : "primary"}
            onClick={onWalletButtonPress}
            disabled={walletButtonDisabled}
            label={walletButtonLabel}
          />
        </Row>

        <Row
          role="status"
          aria-live="polite"
          gap="12"
          padding="16"
          radius="l"
          background={proofColors.background}
          border={proofColors.border}
          vertical="center"
        >
          <Badge effect={false} onBackground={proofColors.text} background="transparent">
            <Text variant="label-strong-s" onBackground={proofColors.text}>
              Wallet verification
            </Text>
          </Badge>
          <Column gap="4" flex={1}>
            <Text variant="label-strong-m" onBackground={proofColors.text}>
              {tonProofStatus.title}
            </Text>
            {tonProofStatus.description && (
              <Text variant="body-default-s" onBackground={proofColors.text}>
                {tonProofStatus.description}
              </Text>
            )}
          </Column>
          {tonProofStatus.showRetry && (
            <Button
              type="button"
              variant="tertiary"
              size="s"
              onClick={onTonProofRetry}
              disabled={tonProofStatus.retryDisabled}
              label="Retry"
            />
          )}
        </Row>

        {planTagline && (
          <Text variant="label-strong-m" onBackground="accent-strong">
            {planTagline}
          </Text>
        )}

        <Row
          gap="16"
          wrap
          border="transparent"
          background="surface"
          padding="20"
          radius="xl"
          horizontal="between"
        >
          <Column gap="4" minWidth={16}>
            <Text variant="label-default-s" onBackground="neutral-medium">
              Wallet
            </Text>
            <Text variant="body-strong-m">
              {walletLabel}
            </Text>
          </Column>
          <Column gap="4" minWidth={16}>
            <Text variant="label-default-s" onBackground="neutral-medium">
              Telegram ID
            </Text>
            <Text variant="body-strong-m">
              {telegramLabel}
            </Text>
          </Column>
          <Column gap="4" minWidth={16}>
            <Text variant="label-default-s" onBackground="neutral-medium">
              Plans
            </Text>
            <Text
              variant="body-strong-m"
              onBackground={planStatusTone === "error" ? "danger-strong" : undefined}
            >
              {planStatusLabel}
            </Text>
          </Column>
          <Column gap="4" minWidth={16}>
            <Text variant="label-default-s" onBackground="neutral-medium">
              Live feed
            </Text>
            <Text variant="body-strong-m">
              {liveFeedLabel}
            </Text>
          </Column>
          {selectedPlan && (
            <Column gap="4" minWidth={16}>
              <Text variant="label-default-s" onBackground="neutral-medium">
                Selected plan
              </Text>
              <Text variant="body-strong-m">
                {selectedPlan.price && selectedPlan.amountAvailable !== false
                  ? `${selectedPlan.name} • ${selectedPlan.price}`
                  : selectedPlan.name}
              </Text>
            </Column>
          )}
        </Row>
      </Column>
    </Card>
  );
}
