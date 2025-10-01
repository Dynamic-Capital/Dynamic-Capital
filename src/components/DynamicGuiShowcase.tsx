"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Pulse,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { dynamicBranding } from "@/resources";

interface MetricHighlight {
  icon: string;
  value: string;
  label: string;
  description: string;
}

interface PlanPreset {
  id: string;
  name: string;
  price: string;
  icon: string;
  summary: string;
  badge?: string;
  turnaround: string;
  focus: string;
  benefits: string[];
}

interface WorkflowStep {
  id: string;
  icon: string;
  title: string;
  short: string;
  description: string;
  highlights: string[];
  tip: string;
}

const BRAND_METADATA = dynamicBranding.metadata;
const BRAND_GRADIENTS = dynamicBranding.gradients;
const BRAND_GLASS = BRAND_GRADIENTS.glass;

const METRIC_HIGHLIGHTS: MetricHighlight[] = [
  {
    icon: "shield",
    value: "99.9%",
    label: "desk uptime",
    description:
      "Redundant guardrails keep deposits safe and auditable for every cohort.",
  },
  {
    icon: "zap",
    value: "2m avg",
    label: "payment review",
    description: "Bank & crypto proofs sync to reviewers in minutes.",
  },
  {
    icon: "repeat",
    value: "80%",
    label: "automation coverage",
    description: "Dynamic playbooks orchestrate the repetitive steps for you.",
  },
];

const PLAN_PRESETS: PlanPreset[] = [
  {
    id: "starter",
    name: "Signal Launchpad",
    price: "$99/mo",
    icon: "sparkles",
    summary: "Guided trade prompts with built-in risk guardrails.",
    badge: "Popular",
    turnaround: "Under 5 minutes to onboard",
    focus: "For new desk members",
    benefits: [
      "Auto-syncs alerts to Telegram and the web dashboard",
      "Compliance-ready receipts with every approved transfer",
      "Warm-up drills delivered alongside live signal context",
    ],
  },
  {
    id: "growth",
    name: "Momentum Studio",
    price: "$249/mo",
    icon: "trending-up",
    summary: "Personalized scenarios, coaching clips, and weekly reviews.",
    turnaround: "Desk concierge in < 2 hours",
    focus: "For scaling traders",
    benefits: [
      "Pair accounts across bank, crypto, and prop firm wallets",
      "Scenario builder exports ready-to-run automations",
      "Shared review workspace keeps mentors & analysts aligned",
    ],
  },
  {
    id: "vip",
    name: "Dynamic VIP Desk",
    price: "$799/mo",
    icon: "crown",
    summary: "Hands-on desk with white-glove payment routing & risk ops.",
    turnaround: "Full concierge in < 30 minutes",
    focus: "For desk partners",
    benefits: [
      "Priority routing with dedicated Telegram escalation lane",
      "Batch settlement tracking across every funding channel",
      "Live hedging telemetry streamed to your command center",
    ],
  },
];

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "intake",
    icon: "inbox",
    title: "Unified intake",
    short: "Collect documents",
    description:
      "Start from a single intake form that captures KYC docs, preferred payment rails, and trading objectives.",
    highlights: [
      "Dynamic form swaps fields based on desk playbook",
      "Uploads stored with instant compliance checks",
      "Telegram mini app mirrors the same step in real time",
    ],
    tip:
      "Desk members can pause and resume the intake from any device without losing progress.",
  },
  {
    id: "routing",
    icon: "map",
    title: "Smart routing",
    short: "Pick the payment lane",
    description:
      "Let the GUI route deposits through the optimal bank, crypto, or prop channel with real-time limits applied.",
    highlights: [
      "See guardrails for each rail before committing",
      "Auto-generated payment instructions with QR & deep links",
      "Escalation lane pre-configured for high-touch clients",
    ],
    tip:
      "Switch rails on the fly—Dynamic Capital recalculates fees and compliance checks instantly.",
  },
  {
    id: "review",
    icon: "check",
    title: "Proof review",
    short: "Verify receipts",
    description:
      "Review incoming proofs with AI triage, annotate exceptions, and trigger automated follow-ups when needed.",
    highlights: [
      "Live status sync to Telegram, email, and the web console",
      "Two-click escalation to senior desk operators",
      "Immutable audit trail exported to your vault",
    ],
    tip:
      "Approvals push straight to the trading room so clients can deploy capital immediately.",
  },
];

export function DynamicGuiShowcase() {
  const navigate = useNavigate();
  const [activePlanId, setActivePlanId] = useState<string>(PLAN_PRESETS[0].id);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const heroSurfaceStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: BRAND_GRADIENTS.hero,
      border: "1px solid hsl(var(--dc-brand) / 0.16)",
      boxShadow: BRAND_GLASS.motionShadow,
      backdropFilter: BRAND_GLASS.motionBlur,
      position: "relative",
      overflow: "hidden",
    }),
    [],
  );

  const planPanelStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: BRAND_GRADIENTS.motion.card,
      border: "1px solid hsl(var(--dc-brand) / 0.12)",
      backdropFilter: BRAND_GLASS.motionBlur,
    }),
    [],
  );

  const timelinePanelStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: BRAND_GRADIENTS.card,
      border: "1px solid hsl(var(--dc-brand) / 0.08)",
      backdropFilter: BRAND_GLASS.motionBlur,
    }),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveStepIndex((previous) => (previous + 1) % WORKFLOW_STEPS.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  const selectedPlan = useMemo(
    () =>
      PLAN_PRESETS.find((plan) => plan.id === activePlanId) ?? PLAN_PRESETS[0],
    [activePlanId],
  );

  const activeStep = useMemo(
    () => WORKFLOW_STEPS[activeStepIndex] ?? WORKFLOW_STEPS[0],
    [activeStepIndex],
  );

  return (
    <Column gap="48" fillWidth align="center" horizontal="center">
      <Column
        as="section"
        fillWidth
        maxWidth="l"
        paddingX="16"
        paddingY="48"
        gap="40"
        align="center"
        horizontal="center"
      >
        <Column
          background="surface"
          border="transparent"
          radius="xl"
          shadow="xl"
          padding="xl"
          gap="32"
          fillWidth
          align="center"
          horizontal="center"
          style={heroSurfaceStyle}
        >
          <Row
            position="absolute"
            pointerEvents="none"
            style={{
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundImage: BRAND_GRADIENTS.motion.backgroundLight,
              opacity: 0.55,
            }}
          />
          <Row
            position="absolute"
            pointerEvents="none"
            style={{
              top: "-40%",
              right: "-40%",
              bottom: "-40%",
              left: "-40%",
              backgroundImage: BRAND_GRADIENTS.brand,
              opacity: 0.08,
            }}
          />
          <Column gap="16" align="center">
            <Row gap="12" vertical="center" horizontal="center">
              <Pulse size="s" variant="brand" aria-hidden="true" />
              <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
                {BRAND_METADATA.name} · Dynamic GUI
              </Tag>
            </Row>
            <Heading variant="display-strong-s" align="center" wrap="balance">
              Compose deposit flows without touching a single spreadsheet.
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              align="center"
              wrap="balance"
            >
              {BRAND_METADATA.tagline}
            </Text>
            <Text
              variant="label-default-s"
              onBackground="neutral-medium"
              align="center"
              wrap="balance"
            >
              Orchestrate onboarding, route payments, and verify proofs from one
              responsive workspace. Built for high-velocity desks that juggle
              bank, crypto, and prop channels.
            </Text>
            <Row gap="12" wrap horizontal="center">
              <Button
                size="m"
                variant="primary"
                data-border="rounded"
                prefixIcon="sparkles"
                onClick={() => navigate("/checkout")}
              >
                Launch checkout
              </Button>
              <Button
                size="m"
                variant="secondary"
                data-border="rounded"
                prefixIcon="calendar"
                onClick={() => navigate("/checkout?plan=vip")}
              >
                Preview VIP flow
              </Button>
            </Row>
          </Column>

          <Row gap="16" wrap horizontal="center">
            {METRIC_HIGHLIGHTS.map((metric) => (
              <Column
                key={metric.label}
                gap="12"
                background="surface"
                border="brand-alpha-weak"
                radius="l"
                paddingX="20"
                paddingY="16"
                minWidth={16}
                fillWidth
              >
                <Row gap="12" vertical="center">
                  <Icon name={metric.icon} onBackground="brand-medium" />
                  <Column gap="4">
                    <Text variant="heading-strong-m">{metric.value}</Text>
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-weak"
                    >
                      {metric.label}
                    </Text>
                  </Column>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-medium">
                  {metric.description}
                </Text>
              </Column>
            ))}
          </Row>

          <Column gap="24" fillWidth align="center">
            <Column gap="8" align="center">
              <Text variant="label-strong-s" onBackground="brand-medium">
                Choose a deposit lane
              </Text>
              <Text
                variant="body-default-m"
                onBackground="neutral-weak"
                align="center"
                wrap="balance"
              >
                Toggle between preset desk experiences to see how the Dynamic
                GUI adapts pricing, guardrails, and automation overlays.
              </Text>
            </Column>

            <Row gap="12" wrap horizontal="center">
              {PLAN_PRESETS.map((plan) => {
                const isActive = plan.id === activePlanId;

                return (
                  <Column
                    key={plan.id}
                    as="button"
                    type="button"
                    onClick={() => setActivePlanId(plan.id)}
                    gap="12"
                    background={isActive
                      ? "brand-alpha-strong"
                      : "neutral-alpha-weak"}
                    border={isActive ? "brand-medium" : "neutral-alpha-weak"}
                    radius="l"
                    paddingX="20"
                    paddingY="16"
                    minWidth={18}
                    fillWidth
                    horizontal="start"
                    data-active={isActive ? "true" : "false"}
                    aria-pressed={isActive}
                  >
                    <Row gap="8" vertical="center">
                      <Icon
                        name={plan.icon}
                        onBackground={isActive
                          ? "brand-strong"
                          : "brand-medium"}
                      />
                      <Column gap="4" horizontal="start">
                        <Text variant="label-strong-s" align="left">
                          {plan.name}
                        </Text>
                        <Text
                          variant="label-default-s"
                          onBackground={isActive
                            ? "neutral-strong"
                            : "neutral-weak"}
                          align="left"
                        >
                          {plan.focus}
                        </Text>
                      </Column>
                    </Row>
                    <Row gap="8" wrap vertical="center" horizontal="start">
                      <Tag size="s" background="neutral-alpha-weak">
                        {plan.price}
                      </Tag>
                      <Tag size="s" background="neutral-alpha-weak">
                        {plan.turnaround}
                      </Tag>
                      {plan.badge
                        ? (
                          <Tag size="s" background="brand-alpha-weak">
                            {plan.badge}
                          </Tag>
                        )
                        : null}
                    </Row>
                  </Column>
                );
              })}
            </Row>

            <Column
              background="surface"
              border="transparent"
              radius="xl"
              padding="l"
              gap="16"
              fillWidth
              style={planPanelStyle}
            >
              <Row gap="12" vertical="center">
                <Icon name={selectedPlan.icon} onBackground="brand-medium" />
                <Heading variant="heading-strong-m">
                  {selectedPlan.name}
                </Heading>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {selectedPlan.summary}
              </Text>
              <Column gap="8">
                {selectedPlan.benefits.map((benefit) => (
                  <Row key={benefit} gap="8" vertical="center">
                    <Icon name="check" onBackground="brand-medium" />
                    <Text
                      variant="body-default-s"
                      onBackground="neutral-strong"
                    >
                      {benefit}
                    </Text>
                  </Row>
                ))}
              </Column>
            </Column>
          </Column>

          <Column gap="24" fillWidth align="center">
            <Column gap="8" align="center">
              <Text variant="label-strong-s" onBackground="brand-medium">
                End-to-end journey
              </Text>
              <Text
                variant="body-default-m"
                onBackground="neutral-weak"
                align="center"
                wrap="balance"
              >
                Every step is orchestrated inside the Dynamic GUI. Tap a stage
                to see how the workspace responds in real time.
              </Text>
            </Column>

            <Row gap="12" wrap horizontal="center">
              {WORKFLOW_STEPS.map((step, index) => {
                const isActive = index === activeStepIndex;

                return (
                  <Column
                    key={step.id}
                    as="button"
                    type="button"
                    onClick={() => setActiveStepIndex(index)}
                    gap="12"
                    background={isActive
                      ? "brand-alpha-strong"
                      : "neutral-alpha-weak"}
                    border={isActive ? "brand-medium" : "neutral-alpha-weak"}
                    radius="l"
                    paddingX="20"
                    paddingY="16"
                    minWidth={18}
                    fillWidth
                    horizontal="start"
                    data-active={isActive ? "true" : "false"}
                    aria-pressed={isActive}
                  >
                    <Row gap="8" vertical="center">
                      <Icon
                        name={step.icon}
                        onBackground={isActive
                          ? "brand-strong"
                          : "brand-medium"}
                      />
                      <Column gap="4" horizontal="start">
                        <Text variant="label-strong-s" align="left">
                          {step.title}
                        </Text>
                        <Text
                          variant="label-default-s"
                          onBackground={isActive
                            ? "neutral-strong"
                            : "neutral-weak"}
                          align="left"
                        >
                          {step.short}
                        </Text>
                      </Column>
                    </Row>
                  </Column>
                );
              })}
            </Row>

            <Column
              background="surface"
              border="transparent"
              radius="xl"
              padding="l"
              gap="16"
              fillWidth
              style={timelinePanelStyle}
            >
              <Row gap="12" vertical="center">
                <Icon name={activeStep.icon} onBackground="brand-medium" />
                <Heading variant="heading-strong-m">{activeStep.title}</Heading>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {activeStep.description}
              </Text>
              <Column gap="8">
                {activeStep.highlights.map((highlight) => (
                  <Row key={highlight} gap="8" vertical="center">
                    <Icon name="check" onBackground="brand-medium" />
                    <Text
                      variant="body-default-s"
                      onBackground="neutral-strong"
                    >
                      {highlight}
                    </Text>
                  </Row>
                ))}
              </Column>
              <Text variant="label-default-s" onBackground="neutral-medium">
                {activeStep.tip}
              </Text>
            </Column>
          </Column>

          <Line background="neutral-alpha-weak" />

          <Column gap="12" align="center">
            <Heading variant="heading-strong-m" align="center" wrap="balance">
              Ready to orchestrate your own Dynamic GUI?
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              align="center"
              wrap="balance"
            >
              Connect your preferred payment rails and let the workspace handle
              playbook routing, receipts, and compliance snapshots.
            </Text>
            <Row gap="12" wrap horizontal="center">
              <Button
                size="m"
                variant="primary"
                data-border="rounded"
                prefixIcon="sparkles"
                onClick={() => navigate("/checkout")}
              >
                Start onboarding
              </Button>
              <Button
                size="m"
                variant="secondary"
                data-border="rounded"
                prefixIcon="repeat"
                onClick={() => navigate("/checkout?promo=desk-demo")}
              >
                Request a live walkthrough
              </Button>
            </Row>
          </Column>
        </Column>
      </Column>
    </Column>
  );
}

export default DynamicGuiShowcase;
