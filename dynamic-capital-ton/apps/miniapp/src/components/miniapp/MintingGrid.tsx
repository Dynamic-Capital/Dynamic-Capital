"use client";

import {
  Badge,
  Button,
  Card,
  Column,
  Heading,
  ProgressBar,
  Row,
  Text,
} from "@once-ui-system/core";

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

  return (
    <Card
      key={plan.index}
      padding="24"
      radius="xl"
      background="transparent"
      border="neutral-alpha-medium"
      style={{
        background:
          "linear-gradient(135deg, var(--mint-sheen), rgba(6,9,18,0.92))",
        boxShadow: "0 16px 32px var(--mint-glow)",
        "--mint-accent": plan.accent,
        "--mint-soft": plan.accentSoft,
        "--mint-glow": plan.glow,
        "--mint-sheen": plan.accentSoft,
      }}
    >
      <Column gap="16">
        <Row horizontal="between" vertical="center">
          <Column gap="4">
            <Text variant="label-strong-s" onBackground="accent-strong">
              Mint #{plan.index}
            </Text>
            <Heading as="h3" size="display-xxs">
              {plan.name}
            </Heading>
          </Column>
          <Badge effect={false} onBackground="accent-strong" background="accent-alpha-weak" aria-label="Default priority">
            <Text variant="label-strong-s" onBackground="accent-strong">
              Priority {plan.defaultPriority}
            </Text>
          </Badge>
        </Row>

        <Row gap="8" wrap>
          <Badge effect={false} onBackground="accent-strong" background="accent-alpha-weak">
            <Text variant="label-s" onBackground="accent-strong">
              {plan.launchWindow}
            </Text>
          </Badge>
          <Badge effect={false} onBackground="accent-strong" background="transparent">
            <Text variant="label-s" onBackground="accent-strong">
              {plan.supply}
            </Text>
          </Badge>
        </Row>

        <Text variant="body-m" onBackground="neutral-strong">
          {plan.description}
        </Text>

        <ProgressBar
          value={progressValue}
          min={0}
          max={100}
          aria-valuetext={progressText}
          background="neutral-alpha-weak"
          barBackground="accent-strong"
          padding="12"
          radius="l"
        />

        <Row horizontal="between" vertical="center">
          <Column gap="4">
            <Text variant="label-s" onBackground="neutral-medium">
              Launch window
            </Text>
            <Text variant="body-s" weight="strong">
              {plan.launchWindow}
            </Text>
          </Column>
          <Column gap="4">
            <Text variant="label-s" onBackground="neutral-medium">
              Supply
            </Text>
            <Text variant="body-s" weight="strong">
              {plan.supply}
            </Text>
          </Column>
          <Column gap="4">
            <Text variant="label-s" onBackground="neutral-medium">
              Content URI
            </Text>
            <Text variant="body-s" weight="strong">
              {plan.contentUri}
            </Text>
          </Column>
          <Column gap="4">
            <Text variant="label-s" onBackground="neutral-medium">
              Status
            </Text>
            <Badge effect={false} onBackground="accent-strong" background="transparent">
              <Text variant="label-strong-s" onBackground="accent-strong">
                {statusLabel}
              </Text>
            </Badge>
          </Column>
        </Row>

        {helperText && (
          <Text
            variant="body-s"
            onBackground={state.status === "error" ? "red-strong" : "neutral-medium"}
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
    <Card as="section" id="minting" padding="32" radius="2xl" gap="24" background="surface">
      <Column gap="12">
        <Heading as="h2" size="display-xs">
          Theme minting
        </Heading>
        <Text variant="body-m" onBackground="neutral-strong">
          Launch each Theme Pass drop with a single tap. Every run is logged to the treasury ledger for auditability.
        </Text>
      </Column>
      <Row gap="16" wrap>
        {plans.map((plan) => (
          <MintCard
            key={plan.index}
            plan={plan}
            state={states[plan.index] ?? { status: "idle", progress: 0 }}
            onStartMint={onStartMint}
            formatRelativeTime={formatRelativeTime}
          />
        ))}
      </Row>
    </Card>
  );
}
