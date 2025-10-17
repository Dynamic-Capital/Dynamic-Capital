"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Grid,
  Heading,
  List,
  Row,
  StatusIndicator,
  Text,
  type Colors,
} from "@once-ui-system/core";

import type { ComponentProps } from "react";

import type { ThemeMintPlan } from "@/data/theme-mints";

type MintingPlanState =
  | { status: "idle"; progress: 0 }
  | { status: "starting"; progress: number }
  | { status: "success"; progress: 100; startedAt?: string }
  | { status: "error"; progress: number; error: string };

type MintingGridProps = {
  plans: readonly ThemeMintPlan[];
  states: Record<number, MintingPlanState>;
  onStartMint: (plan: ThemeMintPlan) => void;
  formatRelativeTime: (iso: string) => string;
};

type StatusIndicatorColor = ComponentProps<typeof StatusIndicator>["color"];

const MINT_ACCENTS: Record<number, { accent: string; indicator: StatusIndicatorColor }> = {
  0: { accent: "cyan", indicator: "cyan" },
  1: { accent: "yellow", indicator: "yellow" },
  2: { accent: "magenta", indicator: "magenta" },
};

const MINT_STEPS = [
  { key: "ready", label: "Queue mint" },
  { key: "coordinating", label: "Coordinate validators" },
  { key: "scheduled", label: "Mint scheduled" },
] as const;

function MintCard({
  plan,
  state,
  onStartMint,
  formatRelativeTime,
}: {
  plan: ThemeMintPlan;
  state: MintingPlanState;
  onStartMint: (plan: ThemeMintPlan) => void;
  formatRelativeTime: (iso: string) => string;
}) {
  const isStarting = state.status === "starting";
  const isComplete = state.status === "success";
  const progressValue = Math.min(100, Math.max(0, Math.round(state.progress)));
  const accent = MINT_ACCENTS[plan.index] ?? MINT_ACCENTS[0];
  const currentStepIndex = state.status === "success"
    ? MINT_STEPS.length - 1
    : state.status === "starting"
    ? 1
    : 0;
  const errorStepIndex = state.status === "error" ? currentStepIndex : null;

  const statusLabel = (() => {
    switch (state.status) {
      case "starting":
        return "Coordinating";
      case "success":
        return "Mint scheduled";
      case "error":
        return "Failed";
      default:
        return "Ready";
    }
  })();

  const helperText = (() => {
    switch (state.status) {
      case "starting":
        return progressValue >= 95
          ? "Awaiting treasury confirmation…"
          : `Coordinating validators • ${progressValue}%`;
      case "success":
        return state.startedAt
          ? `Started ${formatRelativeTime(state.startedAt)}`
          : "Mint run started.";
      case "error":
        return state.error ?? "Mint run could not start. Try again.";
      default:
        return "Tap start to dispatch this theme run.";
    }
  })();

  const messageRole = state.status === "error"
    ? "alert"
    : state.status === "starting" || state.status === "success"
    ? "status"
    : undefined;

  const progressText = (() => {
    switch (state.status) {
      case "starting":
        return `Mint progress ${progressValue}%`;
      case "success":
        return "Mint scheduled";
      case "error":
        return "Mint failed";
      default:
        return undefined;
    }
  })();

  const statusBadgeTone: { background: Colors; onBackground: Colors } =
    state.status === "error"
      ? { background: "danger-alpha-weak", onBackground: "danger-strong" }
      : state.status === "success"
      ? { background: "success-alpha-weak", onBackground: "success-strong" }
      : { background: "accent-alpha-weak", onBackground: "accent-strong" };
  const helperTone: Colors = state.status === "error"
    ? "danger-strong"
    : "neutral-medium";

  const resolveStepColor = (stepIndex: number): StatusIndicatorColor => {
    if (errorStepIndex !== null && stepIndex === errorStepIndex) {
      return "red";
    }
    if (stepIndex < currentStepIndex) {
      return "green";
    }
    if (stepIndex === currentStepIndex) {
      return accent.indicator;
    }
    return "gray";
  };

  return (
    <Card
      key={plan.index}
      padding="24"
      radius="xl"
      background="surface"
      border="neutral-alpha-medium"
      gap="16"
      data-accent={accent.accent}
    >
      <Column gap="16">
        <Row horizontal="between" vertical="center">
          <Column gap="4">
            <Text variant="label-strong-s" onBackground="accent-strong">
              Mint #{plan.index}
            </Text>
            <Heading as="h3" variant="display-strong-xs">
              {plan.name}
            </Heading>
          </Column>
          <Badge
            effect={false}
            onBackground="accent-strong"
            background="accent-alpha-weak"
            aria-label="Default priority"
          >
            <Text variant="label-strong-s" onBackground="accent-strong">
              Priority {plan.defaultPriority}
            </Text>
          </Badge>
        </Row>

        <Text variant="body-default-m" onBackground="neutral-strong">
          {plan.description}
        </Text>

        <Column
          gap="12"
          role="group"
          aria-label={`Mint status ${progressText ?? statusLabel}`}
        >
          <Row horizontal="between" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-medium">
              Mint track
            </Text>
            <Badge
              effect={false}
              background={statusBadgeTone.background}
              onBackground={statusBadgeTone.onBackground}
            >
              <Text
                variant="label-strong-s"
                onBackground={statusBadgeTone.onBackground}
              >
                {statusLabel}
              </Text>
            </Badge>
          </Row>
          <List as="ol" gap="12">
            {MINT_STEPS.map((step, index) => {
              const isCurrent = index === currentStepIndex;
              const indicatorColor = resolveStepColor(index);
              const stepVariant = isCurrent ? "label-strong-s" : "label-default-s";
              return (
                <Row
                  as="li"
                  key={step.key}
                  gap="12"
                  vertical="center"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <StatusIndicator
                    size="s"
                    color={indicatorColor}
                    ariaLabel={`${step.label}: ${isCurrent ? statusLabel : index < currentStepIndex ? "Complete" : "Pending"}`}
                  />
                  <Text
                    variant={stepVariant}
                    onBackground={isCurrent ? "neutral-strong" : "neutral-medium"}
                  >
                    {step.label}
                  </Text>
                  {isCurrent && state.status === "starting" && (
                    <Badge effect={false} background="accent-alpha-weak" onBackground="accent-strong">
                      <Text variant="label-strong-xs" onBackground="accent-strong">
                        {progressValue}%
                      </Text>
                    </Badge>
                  )}
                  {isCurrent && state.status === "success" && state.startedAt && (
                    <Text variant="label-default-s" onBackground="neutral-medium">
                      {formatRelativeTime(state.startedAt)}
                    </Text>
                  )}
                </Row>
              );
            })}
          </List>
        </Column>

        <Grid columns="3" gap="16" m={{ columns: "2" }} s={{ columns: "1" }}>
          <Column gap="4">
            <Text variant="label-default-s" onBackground="neutral-medium">
              Launch window
            </Text>
            <Text variant="body-strong-s">
              {plan.launchWindow}
            </Text>
          </Column>
          <Column gap="4">
            <Text variant="label-default-s" onBackground="neutral-medium">
              Supply
            </Text>
            <Text variant="body-strong-s">
              {plan.supply}
            </Text>
          </Column>
          <Column gap="4">
            <Text variant="label-default-s" onBackground="neutral-medium">
              Content URI
            </Text>
            <Text variant="body-strong-s">
              {plan.contentUri}
            </Text>
          </Column>
        </Grid>

        {helperText && (
          <Text
            variant="body-default-s"
            onBackground={helperTone}
            role={messageRole}
            aria-live={messageRole ? "polite" : undefined}
          >
            {helperText}
          </Text>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() => onStartMint(plan)}
          disabled={isStarting || isComplete}
          label={
            isStarting
              ? "Starting…"
              : isComplete
              ? "Mint scheduled"
              : state.status === "error"
              ? "Retry mint"
              : "Start minting"
          }
        />
      </Column>
    </Card>
  );
}

export function MintingGrid({ plans, states, onStartMint, formatRelativeTime }: MintingGridProps) {
  return (
    <Card
      as="section"
      id="minting"
      padding="32"
      radius="xl"
      gap="24"
      background="surface"
    >
      <Column gap="12">
        <Heading as="h2" variant="display-strong-s">
          Theme minting
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-strong">
          Launch each Theme Pass drop with a single tap. Every run is logged to the treasury ledger for auditability.
        </Text>
      </Column>
      <Grid columns="3" gap="16" l={{ columns: "2" }} s={{ columns: "1" }}>
        {plans.map((plan) => (
          <MintCard
            key={plan.index}
            plan={plan}
            state={states[plan.index] ?? { status: "idle", progress: 0 }}
            onStartMint={onStartMint}
            formatRelativeTime={formatRelativeTime}
          />
        ))}
      </Grid>
    </Card>
  );
}
