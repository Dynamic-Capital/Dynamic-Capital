"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Heading,
  Row,
  Text,
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

function metricTrendColor(trend?: HeroMetric["trend"]): string {
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
            <Text variant="display-s" weight="strong">
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

function resolveProofColors(variant: TonProofVariant) {
  switch (variant) {
    case "success":
      return {
        background: "green-alpha-weak" as const,
        border: "green-alpha-medium" as const,
        text: "green-strong" as const,
      };
    case "error":
      return {
        background: "red-alpha-weak" as const,
        border: "red-alpha-medium" as const,
        text: "red-strong" as const,
      };
    case "loading":
      return {
        background: "brand-alpha-weak" as const,
        border: "brand-alpha-medium" as const,
        text: "brand-strong" as const,
      };
    default:
      return {
        background: "neutral-alpha-weak" as const,
        border: "neutral-alpha-medium" as const,
        text: "neutral-strong" as const,
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
      radius="2xl"
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
            <Heading as="h1" size="display-xs">
              {title}
            </Heading>
            <Text variant="body-l" onBackground="neutral-strong">
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
              <Text variant="body-s" onBackground={proofColors.text}>
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
            <Text variant="label-s" onBackground="neutral-medium">
              Wallet
            </Text>
            <Text variant="body-m" weight="strong">
              {walletLabel}
            </Text>
          </Column>
          <Column gap="4" minWidth={16}>
            <Text variant="label-s" onBackground="neutral-medium">
              Telegram ID
            </Text>
            <Text variant="body-m" weight="strong">
              {telegramLabel}
            </Text>
          </Column>
          <Column gap="4" minWidth={16}>
            <Text variant="label-s" onBackground="neutral-medium">
              Plans
            </Text>
            <Text
              variant="body-m"
              weight="strong"
              onBackground={planStatusTone === "error" ? "red-strong" : undefined}
            >
              {planStatusLabel}
            </Text>
          </Column>
          <Column gap="4" minWidth={16}>
            <Text variant="label-s" onBackground="neutral-medium">
              Live feed
            </Text>
            <Text variant="body-m" weight="strong">
              {liveFeedLabel}
            </Text>
          </Column>
          {selectedPlan && (
            <Column gap="4" minWidth={16}>
              <Text variant="label-s" onBackground="neutral-medium">
                Selected plan
              </Text>
              <Text variant="body-m" weight="strong">
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
