"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Flex,
  Grid,
  Icon,
  List,
  ListItem,
  Text,
} from "@once-ui-system/core";

import type { TonProofUiState } from "@/lib/ton-proof-state";
import type { Plan } from "@/lib/ton-miniapp-helper";

import {
  formatAdjustmentLabel,
  formatPercent,
  type NormalizedPlanSnapshot,
  type PlanOption,
  type PlanVisual,
  type SnapshotAdjustment,
} from "../home/model";

export type PlanSelectionProps = {
  options: PlanOption[];
  selectedPlanId: Plan | null;
  onSelect: (plan: Plan) => void;
  visual: PlanVisual;
  planSnapshot: NormalizedPlanSnapshot | null;
  planTonLabel: string | null;
  planDctLabel: string | null;
  planUpdatedLabel: string | null;
  tonProofUi: TonProofUiState;
  onRetryTonProof: () => void;
  onLinkWallet: () => void;
  onStartSubscription: () => void;
  isLinking: boolean;
  isProcessing: boolean;
  statusMessage: string | null;
  txHash: string;
  walletConnected: boolean;
  walletVerified: boolean;
};

export function PlanSelection({
  options,
  selectedPlanId,
  onSelect,
  visual,
  planSnapshot,
  planTonLabel,
  planDctLabel,
  planUpdatedLabel,
  tonProofUi,
  onRetryTonProof,
  onLinkWallet,
  onStartSubscription,
  isLinking,
  isProcessing,
  statusMessage,
  txHash,
  walletConnected,
  walletVerified,
}: PlanSelectionProps) {
  const selected = options.find((option) => option.id === selectedPlanId) ?? null;

  return (
    <Column as="section" id="plans" gap="l">
      <Column gap="s">
        <Text variant="code-strong-s" onBackground="brand-strong">
          Plan catalog
        </Text>
        <Text variant="heading-strong-l">Choose a runway that matches your desk needs</Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Pricing updates stream directly from the trading desk. Select a plan to view the latest mint snapshot and begin verification.
        </Text>
      </Column>

      <Grid columns="2" gap="m" m={{ columns: "1" }} s={{ columns: "1" }}>
        {options.map((option) => (
          <Card
            key={option.id}
            border={option.id === selectedPlanId ? "brand-alpha-medium" : "neutral-alpha-weak"}
            background="surface"
            radius="xl"
            padding="l"
            shadow={option.id === selectedPlanId ? "xl" : undefined}
            onClick={() => onSelect(option.id)}
            cursor="pointer"
          >
            <Column gap="m">
              <Column gap="s">
                <Flex direction="row" horizontal="between" vertical="center">
                  <Text variant="heading-strong-m">{option.name}</Text>
                  {option.id === selectedPlanId && (
                    <Badge textVariant="body-default-xs" background="brand-alpha-weak" onBackground="brand-strong">
                      Selected
                    </Badge>
                  )}
                </Flex>
                <Text variant="heading-default-m" onBackground="neutral-weak">
                  {option.price}
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {option.cadence}
                </Text>
              </Column>
              <List gap="s">
                {option.highlights.map((highlight) => (
                  <ListItem key={highlight} icon={<Icon name="rocket" />}>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {highlight}
                    </Text>
                  </ListItem>
                ))}
              </List>
            </Column>
          </Card>
        ))}
      </Grid>

      {selected && (
        <Card
          background="surface"
          border="neutral-alpha-medium"
          radius="xl"
          padding="xl"
          shadow="xl"
        >
          <Column gap="l">
            <Column gap="s">
              <Text variant="body-strong-s" onBackground="brand-strong">
                {selected.name}
              </Text>
              <Text variant="heading-strong-m">{visual.tagline}</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {selected.description}
              </Text>
            </Column>

            <Grid columns="3" gap="m" m={{ columns: "1" }}>
              <SummaryTile label="Desk price" value={selected.price} />
              <SummaryTile label="Mint TON" value={planTonLabel ?? "Pending"} />
              <SummaryTile label="Desk DCT" value={planDctLabel ?? "Pending"} />
            </Grid>

            <SnapshotBreakdown snapshot={planSnapshot} updatedAt={planUpdatedLabel} />

            <Column gap="m">
              <ProofPanel
                ui={tonProofUi}
                onRetry={onRetryTonProof}
                walletConnected={walletConnected}
              />

              <Flex direction="row" gap="m" wrap>
                <Button
                  variant="secondary"
                  onClick={onLinkWallet}
                  disabled={tonProofUi.linkDisabled || isLinking || walletVerified}
                  loading={isLinking}
                  prefixIcon="wallet"
                >
                  {walletVerified ? "Wallet verified" : "Link TON wallet"}
                </Button>
                <Button
                  variant="primary"
                  onClick={onStartSubscription}
                  disabled={!walletVerified || isProcessing}
                  loading={isProcessing}
                  arrowIcon
                >
                  {isProcessing ? "Processing…" : "Start subscription"}
                </Button>
              </Flex>

              {statusMessage && (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {statusMessage}
                </Text>
              )}
              {txHash && (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Transaction hash: {txHash}
                </Text>
              )}
            </Column>
          </Column>
        </Card>
      )}
    </Column>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card background="surface" border="neutral-alpha-weak" radius="l" padding="l">
      <Column gap="s">
        <Text variant="body-default-s" onBackground="neutral-weak">
          {label}
        </Text>
        <Text variant="heading-strong-s">{value}</Text>
      </Column>
    </Card>
  );
}

type SnapshotBreakdownProps = {
  snapshot: NormalizedPlanSnapshot | null;
  updatedAt: string | null;
};

function SnapshotBreakdown({ snapshot, updatedAt }: SnapshotBreakdownProps) {
  if (!snapshot) {
    return (
      <Card background="neutral-alpha-weak" radius="l" padding="m">
        <Text variant="body-default-s" onBackground="neutral-weak">
          Snapshot data will appear here when available.
        </Text>
      </Card>
    );
  }

  return (
    <Card background="neutral-alpha-weak" radius="l" padding="l">
      <Column gap="s">
        <Flex direction="row" horizontal="between" vertical="center">
          <Text variant="body-strong-s">Performance snapshot</Text>
          {updatedAt && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              Updated {updatedAt}
            </Text>
          )}
        </Flex>
        <Grid columns="3" gap="m" m={{ columns: "1" }}>
          <SnapshotMetric label="Dynamic price" value={snapshot.displayPrice} prefix="$" />
          <SnapshotMetric label="Base price" value={snapshot.basePrice} prefix="$" />
          <SnapshotMetric label="TON rate" value={snapshot.tonRate} prefix="$" fractionDigits={3} />
        </Grid>
        <Grid columns="2" gap="m" m={{ columns: "1" }}>
          <SnapshotMetric label="TON amount" value={snapshot.tonAmount} />
          <SnapshotMetric label="DCT amount" value={snapshot.dctAmount} />
        </Grid>
        <AdjustmentList adjustments={snapshot.adjustments} />
      </Column>
    </Card>
  );
}

function SnapshotMetric({
  label,
  value,
  prefix,
  fractionDigits,
}: {
  label: string;
  value: number | null;
  prefix?: string;
  fractionDigits?: number;
}) {
  return (
    <Column gap="xs">
      <Text variant="body-default-s" onBackground="neutral-weak">
        {label}
      </Text>
      <Text variant="heading-strong-s">
        {value === null
          ? "–"
          : `${prefix ?? ""}${value.toFixed(fractionDigits ?? (value % 1 === 0 ? 0 : 2))}`}
      </Text>
    </Column>
  );
}

function AdjustmentList({ adjustments }: { adjustments: SnapshotAdjustment[] }) {
  if (!adjustments.length) {
    return (
      <Text variant="body-default-s" onBackground="neutral-weak">
        No adjustments recorded in the latest snapshot.
      </Text>
    );
  }

  return (
    <Column gap="xs">
      {adjustments.map((adjustment) => (
        <Flex
          key={adjustment.key}
          direction="row"
          horizontal="between"
          vertical="center"
        >
          <Text variant="body-default-s" onBackground="neutral-weak">
            {formatAdjustmentLabel(adjustment.key)}
          </Text>
          <Text variant="body-strong-s" onBackground="neutral-weak">
            {formatPercent(adjustment.value)}
          </Text>
        </Flex>
      ))}
    </Column>
  );
}

function ProofPanel({
  ui,
  onRetry,
  walletConnected,
}: {
  ui: TonProofUiState;
  onRetry: () => void;
  walletConnected: boolean;
}) {
  const backgroundMap = {
    info: "neutral-alpha-weak",
    loading: "neutral-alpha-weak",
    error: "brand-alpha-weak",
    success: "brand-alpha-weak",
  } as const;

  return (
    <Card background={backgroundMap[ui.variant]} radius="l" padding="m">
      <Column gap="s">
        <Text variant="body-strong-s">{ui.title}</Text>
        {ui.description && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {ui.description}
          </Text>
        )}
        <Flex direction="row" gap="s" wrap>
          <Button
            variant="tertiary"
            size="s"
            onClick={onRetry}
            disabled={!ui.showRetry || ui.retryDisabled || !walletConnected}
          >
            Retry verification
          </Button>
        </Flex>
      </Column>
    </Card>
  );
}
