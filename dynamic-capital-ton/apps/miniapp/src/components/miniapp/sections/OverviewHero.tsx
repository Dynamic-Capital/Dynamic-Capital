"use client";

import { Button, Card, Column, Flex, Heading, Text } from "@once-ui-system/core";
import type { ReactNode } from "react";

import type { LiveMetric } from "@/data/live-intel";

import { MetricsGrid } from "./MetricsGrid";

export type OverviewHeroProps = {
  metrics: LiveMetric[];
  syncCountdown: number | null;
  isSyncing: boolean;
  onRefresh: () => void;
  tonConnectButton: ReactNode;
  walletConnected: boolean;
  planTagline: string;
  statusMessage: string | null;
};

export function OverviewHero({
  metrics,
  syncCountdown,
  isSyncing,
  onRefresh,
  tonConnectButton,
  walletConnected,
  planTagline,
  statusMessage,
}: OverviewHeroProps) {
  return (
    <Card
      as="section"
      id="overview"
      background="surface"
      padding="xl"
      gap="l"
      shadow="xl"
      radius="xl"
    >
      <Flex
        direction="row"
        horizontal="between"
        vertical="center"
        wrap
        gap="m"
      >
        <Column gap="s">
          <Text variant="code-strong-s" onBackground="brand-strong">
            Dynamic Capital Desk
          </Text>
          <Heading variant="display-strong-l">
            Signal-driven growth with TON settlements
          </Heading>
          <Text variant="heading-default-m" onBackground="neutral-weak">
            Seamlessly connect your TON wallet, auto-invest alongside our trading desk, and stay informed with every cycle.
          </Text>
        </Column>
        <Column gap="s" horizontal="end" minWidth={260}>
          {tonConnectButton}
          <Text variant="body-default-s" onBackground="neutral-weak" align="end">
            {walletConnected
              ? "Wallet linked. Desk sync will surface plan updates instantly."
              : "Connect a TON wallet to unlock live subscriptions."}
          </Text>
        </Column>
      </Flex>

      <Card
        background="brand-alpha-weak"
        border="brand-alpha-medium"
        radius="l"
        padding="m"
        gap="s"
      >
        <Flex direction="row" gap="s" vertical="center" wrap>
          <Text variant="body-strong-s" onBackground="brand-strong">
            Auto-syncing Grok-1 + DeepSeek-V2 feed
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {isSyncing
              ? "Updating…"
              : syncCountdown !== null
              ? `Next sync in ${syncCountdown}s`
              : "Awaiting sync"}
          </Text>
          <Button
            variant="tertiary"
            size="s"
            weight="strong"
            onClick={onRefresh}
            loading={isSyncing}
          >
            Refresh now
          </Button>
        </Flex>
        {statusMessage && (
          <Text variant="body-default-s" onBackground="brand-weak">
            {statusMessage}
          </Text>
        )}
      </Card>

      <Text variant="body-default-m" onBackground="neutral-weak">
        {planTagline}
      </Text>

      <MetricsGrid metrics={metrics} />
    </Card>
  );
}
