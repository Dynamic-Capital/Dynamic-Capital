"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Heading,
  Row,
  StatusIndicator,
  Text,
} from "@once-ui-system/core";
import type { ReactNode } from "react";

type PlanOptionCard = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
  meta: {
    amount: number | null;
    tonAmount: number | null;
    dctAmount: number | null;
  };
};

type PlanVisual = {
  accent: string;
  accentStrong: string;
  soft: string;
  glow: string;
  sheen: string;
  surface: string;
  shadow: string;
  tagline?: string | null;
};

type PlanSyncStatusLite = {
  isLoading: boolean;
  isRealtimeSyncing: boolean;
  updatedAt?: string;
  error?: string | null;
};

type PlanDetailMeta = {
  tonLabel?: string | null;
  dctLabel?: string | null;
  updatedLabel?: string | null;
};

type PlanSelectionProps = {
  title: string;
  description: string;
  options: readonly PlanOptionCard[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
  planSyncStatus: PlanSyncStatusLite;
  planVisuals: Record<string, PlanVisual>;
  selectedPlan?: PlanOptionCard | null;
  planDetailMeta?: PlanDetailMeta;
  planSnapshotCard?: ReactNode;
  onStartSubscription: () => void;
  isProcessing: boolean;
  walletVerified: boolean;
  startLabel?: string;
  walletHint?: string | null;
  txHash?: string;
};

function PlanCard({
  option,
  visual,
  isActive,
  onSelect,
}: {
  option: PlanOptionCard;
  visual: PlanVisual;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      as="button"
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      padding="24"
      radius="xl"
      background="transparent"
      border={isActive ? "accent-strong" : "neutral-alpha-medium"}
      style={{
        cursor: "pointer",
        textAlign: "left",
        background:
          "linear-gradient(135deg, var(--card-sheen), var(--card-surface) 58%, rgba(6,9,18,0.82))",
        boxShadow: isActive
          ? "0 18px 40px var(--card-shadow)"
          : "0 8px 24px rgba(15, 23, 42, 0.35)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        transform: isActive ? "translateY(-4px)" : "none",
        "--card-accent": visual.accent,
        "--card-shadow": visual.shadow,
        "--card-sheen": visual.sheen,
        "--card-surface": visual.surface,
      }}
    >
      <Column gap="16">
        <Row horizontal="between" vertical="center">
          <Text variant="label-strong-m" onBackground="accent-strong">
            {option.name}
          </Text>
          <Column align="end" gap="4">
            <Text variant="display-xs" weight="strong">
              {option.price}
            </Text>
            <Text variant="label-s" onBackground="neutral-medium">
              {option.cadence}
            </Text>
          </Column>
        </Row>
        <Text variant="body-m" onBackground="neutral-strong">
          {option.description}
        </Text>
        {option.highlights.length > 0 && (
          <Column as="ul" gap="8">
            {option.highlights.map((highlight) => (
              <Text as="li" key={highlight} variant="label-s" onBackground="neutral-medium">
                {highlight}
              </Text>
            ))}
          </Column>
        )}
        {visual.tagline && (
          <Text variant="label-strong-s" onBackground="accent-strong">
            {visual.tagline}
          </Text>
        )}
      </Column>
    </Card>
  );
}

export function PlanSelection({
  title,
  description,
  options,
  selectedPlanId,
  onSelectPlan,
  planSyncStatus,
  planVisuals,
  selectedPlan,
  planDetailMeta,
  planSnapshotCard,
  onStartSubscription,
  isProcessing,
  walletVerified,
  startLabel = "Start auto-invest",
  walletHint,
  txHash,
}: PlanSelectionProps) {
  const isStatusError = Boolean(planSyncStatus.error);

  return (
    <Card as="section" id="plans" padding="32" radius="2xl" gap="24" background="surface">
      <Row horizontal="between" wrap gap="16">
        <Column gap="8" flex={1} minWidth={20}>
          <Heading as="h2" size="display-xs">
            {title}
          </Heading>
          <Text variant="body-m" onBackground="neutral-strong">
            {description}
          </Text>
        </Column>
        {selectedPlan && (
          <Badge effect={false} onBackground="accent-strong" background="accent-alpha-weak">
            <Text variant="label-strong-s" onBackground="accent-strong">
              {selectedPlan.cadence}
            </Text>
          </Badge>
        )}
      </Row>

      <Row
        role="status"
        aria-live="polite"
        gap="12"
        padding="16"
        radius="l"
        background="neutral-alpha-weak"
        vertical="center"
      >
        <StatusIndicator
          size="s"
          color={isStatusError ? "red" : "cyan"}
          style={planSyncStatus.isLoading || planSyncStatus.isRealtimeSyncing
            ? { animation: "syncPulse 2.4s ease-in-out infinite" }
            : undefined}
          ariaLabel={isStatusError ? "Plan sync offline" : "Plan sync status"}
        />
        <Text variant="label-strong-s" onBackground={isStatusError ? "red-strong" : "neutral-strong"}>
          {planSyncStatus.error
            ? "Live pricing offline – showing cached tiers"
            : planSyncStatus.isLoading
            ? "Syncing latest pricing…"
            : planSyncStatus.isRealtimeSyncing
            ? "Refreshing live pricing…"
            : planSyncStatus.updatedAt
            ? `Synced ${planSyncStatus.updatedAt}`
            : "Live pricing ready"}
        </Text>
      </Row>

      {planSyncStatus.error && (
        <Card role="alert" padding="16" radius="l" background="red-alpha-weak" border="red-alpha-medium">
          <Text variant="body-s" onBackground="red-strong">
            {planSyncStatus.error}
          </Text>
        </Card>
      )}

      <Row gap="16" wrap>
        {options.map((option) => (
          <PlanCard
            key={option.id}
            option={option}
            visual={planVisuals[option.id] ?? planVisuals.default}
            isActive={option.id === selectedPlanId}
            onSelect={() => onSelectPlan(option.id)}
          />
        ))}
      </Row>

      {selectedPlan && (
        <Card
          padding="24"
          radius="xl"
          background="transparent"
          border="accent-alpha-medium"
          style={{
            "--card-shadow": planVisuals[selectedPlan.id]?.shadow ?? "rgba(97,209,255,0.32)",
            "--card-sheen": planVisuals[selectedPlan.id]?.sheen ?? "rgba(97,209,255,0.18)",
            "--card-surface": planVisuals[selectedPlan.id]?.surface ?? "rgba(10,17,35,0.85)",
            background:
              "linear-gradient(135deg, var(--card-sheen), var(--card-surface) 58%, rgba(6,9,18,0.85))",
            boxShadow: "0 18px 36px var(--card-shadow)",
          }}
        >
          <Column gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="label-strong-s" onBackground="accent-strong">
                Currently selected
              </Text>
              <Row gap="8" vertical="center">
                <Text variant="body-m" weight="strong">
                  {selectedPlan.name}
                </Text>
                <Badge effect={false} onBackground="accent-strong" background="accent-alpha-weak">
                  <Text variant="label-strong-s" onBackground="accent-strong">
                    {selectedPlan.cadence}
                  </Text>
                </Badge>
              </Row>
            </Row>
            <Row gap="24" wrap>
              <Column minWidth={16} gap="4">
                <Text variant="label-s" onBackground="neutral-medium">
                  Desk contribution
                </Text>
                <Text variant="body-m" weight="strong">
                  {selectedPlan.price}
                </Text>
              </Column>
              {planDetailMeta?.tonLabel && (
                <Column minWidth={16} gap="4">
                  <Text variant="label-s" onBackground="neutral-medium">
                    TON equivalent
                  </Text>
                  <Text variant="body-m" weight="strong">
                    {planDetailMeta.tonLabel} TON
                  </Text>
                </Column>
              )}
              {planDetailMeta?.dctLabel && (
                <Column minWidth={16} gap="4">
                  <Text variant="label-s" onBackground="neutral-medium">
                    Desk credit
                  </Text>
                  <Text variant="body-m" weight="strong">
                    {planDetailMeta.dctLabel} DCT
                  </Text>
                </Column>
              )}
            </Row>
            {planDetailMeta?.updatedLabel && (
              <Text variant="body-s" onBackground="neutral-medium">
                Last repriced {planDetailMeta.updatedLabel}
              </Text>
            )}
          </Column>
        </Card>
      )}

      {planSnapshotCard}

      <Column gap="12">
        <Button
          type="button"
          variant="primary"
          onClick={onStartSubscription}
          disabled={isProcessing || !walletVerified}
          label={isProcessing ? "Submitting…" : startLabel}
        />
        {!walletVerified && walletHint && (
          <Text variant="body-s" onBackground="neutral-medium">
            {walletHint}
          </Text>
        )}
        {txHash && (
          <Text variant="body-s" onBackground="neutral-medium">
            Latest transaction request: {txHash}
          </Text>
        )}
      </Column>
    </Card>
  );
}
