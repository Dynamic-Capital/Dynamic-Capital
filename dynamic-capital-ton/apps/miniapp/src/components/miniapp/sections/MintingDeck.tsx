"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Flex,
  ProgressBar,
  Text,
} from "@once-ui-system/core";

import type { ThemeMintPlan } from "@/data/theme-mints";

import type { MintingPlanState } from "../home/model";

export type MintingDeckProps = {
  plans: ThemeMintPlan[];
  states: Record<number, MintingPlanState>;
  onStartMint: (plan: ThemeMintPlan) => void;
};

export function MintingDeck({ plans, states, onStartMint }: MintingDeckProps) {
  return (
    <Column as="section" id="minting" gap="l">
      <Column gap="s">
        <Text variant="code-strong-s" onBackground="brand-strong">
          Theme minting
        </Text>
        <Text variant="heading-strong-l">Unlock desk-aligned themes via minting windows</Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Each mint schedules a theme drop aligned to your wallet. Start minting to sync with the next launch window.
        </Text>
      </Column>

      <Column gap="m">
        {plans.map((plan) => {
          const state = states[plan.index] ?? { status: "idle", progress: 0 };
          const progress = Math.min(Math.max(state.progress, 0), 100);
          const statusLabel = resolveStatusLabel(state.status);
          const helper = resolveStatusDescription(state);
          const isLoading = state.status === "starting";
          const isComplete = state.status === "success";

          return (
            <Card
              key={plan.index}
              background="surface"
              border="neutral-alpha-medium"
              radius="xl"
              padding="l"
            >
              <Column gap="m">
                <Flex direction="row" horizontal="between" vertical="center" wrap gap="s">
                  <Column gap="xs">
                    <Text variant="body-strong-s" onBackground="brand-strong">
                      Mint #{plan.index}
                    </Text>
                    <Text variant="heading-strong-m">{plan.name}</Text>
                  </Column>
                  <Badge textVariant="body-default-xs" background="brand-alpha-weak" onBackground="brand-strong">
                    Priority {plan.defaultPriority}
                  </Badge>
                </Flex>

                <Flex direction="row" gap="s" wrap>
                  <Badge textVariant="body-default-xs" background="neutral-alpha-weak">
                    {plan.launchWindow}
                  </Badge>
                  <Badge textVariant="body-default-xs" background="neutral-alpha-weak">
                    {plan.supply}
                  </Badge>
                </Flex>

                <Text variant="body-default-m" onBackground="neutral-weak">
                  {plan.description}
                </Text>

                <ProgressBar value={progress} max={100} />
                <Flex direction="row" horizontal="between" vertical="center">
                  <Text variant="body-strong-s">{statusLabel}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {progress}%
                  </Text>
                </Flex>

                {helper && (
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {helper}
                  </Text>
                )}

                <Button
                  variant="primary"
                  onClick={() => onStartMint(plan)}
                  disabled={isLoading || isComplete}
                  loading={isLoading}
                >
                  {isComplete
                    ? "Mint scheduled"
                    : isLoading
                    ? "Scheduling…"
                    : state.status === "error"
                    ? "Retry mint"
                    : "Start mint"}
                </Button>
              </Column>
            </Card>
          );
        })}
      </Column>
    </Column>
  );
}

function resolveStatusLabel(status: MintingPlanState["status"]) {
  switch (status) {
    case "idle":
      return "Ready";
    case "starting":
      return "Scheduling mint";
    case "success":
      return "Mint scheduled";
    case "error":
      return "Mint failed";
    default:
      return "Ready";
  }
}

function resolveStatusDescription(state: MintingPlanState) {
  if (state.status === "error") {
    return state.error ?? "Unable to schedule mint. Retry shortly.";
  }
  if (state.status === "success") {
    return state.startedAt
      ? `Scheduled at ${new Date(state.startedAt).toLocaleTimeString()}`
      : "Desk will push the theme at the next window.";
  }
  if (state.status === "starting") {
    return "Coordinating mint with the desk engines.";
  }
  return "Mint seats update automatically once your wallet is verified.";
}
