"use client";

import { Fragment, type ReactNode } from "react";

import {
  Button,
  Column,
  Heading,
  Icon,
  RevealFx,
  Row,
  Schema,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { HOME_NAV_SECTION_IDS } from "@/components/landing/home-navigation-config";
import { useHeroMetrics } from "@/hooks/useHeroMetrics";
import { useMultiLlmProviders } from "@/hooks/useMultiLlmProviders";
import type { ProviderId } from "@/services/llm/types";
import { cn } from "@/utils";
import { baseURL, person } from "@/resources";

const PROVIDER_ICON_MAP: Record<ProviderId, string> = {
  openai: "sparkles",
  anthropic: "shield",
  groq: "timer",
  "google-gemma": "globe",
};

const ROUTING_POLICIES = [
  {
    title: "Deterministic guardrails",
    description:
      "Define governance rules per provider: max cost, banned topics, escalation paths, and required safety classifiers.",
    icon: "shield" as const,
  },
  {
    title: "Adaptive ensembles",
    description:
      "Blend responses using latency aware weighting, confidence voting, or rubric scoring to promote the best candidate automatically.",
    icon: "sparkles" as const,
  },
  {
    title: "Streaming fallbacks",
    description:
      "Resume in-flight conversations when a provider degrades. Retry with throttled payloads or swap to a cheaper model mid-stream.",
    icon: "repeat" as const,
  },
  {
    title: "Observability hooks",
    description:
      "Emit structured traces to your warehouse or monitoring stack with latency, cost, and safety audit context per turn.",
    icon: "compass" as const,
  },
];

const RESILIENCE_PILLARS = [
  {
    title: "Compliance-ready logging",
    description:
      "Immutable transcripts with redaction rules ensure regulated workflows meet audit requirements without manual exports.",
    icon: "shield" as const,
  },
  {
    title: "Secrets governance",
    description:
      "Vault provider keys, rotate credentials automatically, and scope workspaces so every automation has least-privilege access.",
    icon: "sparkles" as const,
  },
  {
    title: "Human-in-the-loop",
    description:
      "Escalate any conversation to mentors or subject-matter experts with a single click and preserve adjudication trails.",
    icon: "users" as const,
  },
];

const ONBOARDING_STEPS = [
  {
    stage: "Day 0",
    title: "Connect providers",
    detail:
      "Securely add OpenAI, Anthropic, Groq, and Google Gemma keys or import an existing Once UI configuration snapshot.",
  },
  {
    stage: "Day 1",
    title: "Model benchmarking",
    detail:
      "Replay curated benchmark suites or import your prompts to establish latency, quality, and cost baselines.",
  },
  {
    stage: "Day 3",
    title: "Policy automation",
    detail:
      "Activate routing rules, safety classifiers, and escalation paths tuned to your risk posture and compliance needs.",
  },
  {
    stage: "Day 7",
    title: "Workspace rollout",
    detail:
      "Invite teammates, wire dashboards into your observability stack, and start orchestrating production conversations.",
  },
];

const HERO_BADGES = [
  { icon: "bot" as const, label: "Multi-LLM orchestration" },
  { icon: "clock" as const, label: "Latency-aware routing" },
  { icon: "scales" as const, label: "Cost governance" },
];

const MULTI_LLM_TITLE = "Dynamic Capital — Multi-LLM orchestration workspace";
const MULTI_LLM_DESCRIPTION =
  "Benchmark, route, and observe every provider in a single Once UI workspace designed for institutional desks.";

const tokenFormatter = new Intl.NumberFormat("en-US", { notation: "compact" });

const formatTokens = (value: number) =>
  `${tokenFormatter.format(Math.max(0, value))} tokens`;

const sentenceCase = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

interface SectionProps {
  anchor: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

function Section({ anchor, children, className, delay }: SectionProps) {
  return (
    <RevealFx translateY="16" delay={delay}>
      <section
        id={anchor}
        data-section-anchor={anchor}
        className={cn("w-full", className)}
      >
        <Column
          fillWidth
          gap="24"
          paddingX="16"
          className="mx-auto max-w-6xl"
        >
          {children}
        </Column>
      </section>
    </RevealFx>
  );
}

export function MultiLlmLandingPage() {
  const {
    heroMetrics,
    quickMetrics,
    isError: heroMetricsError,
    error: heroMetricsErrorDetails,
  } = useHeroMetrics();
  const {
    data: providerSummaries = [],
    isLoading: providersLoading,
    isError: providersError,
    error: providersErrorDetails,
  } = useMultiLlmProviders();

  const heroMetricsUsingFallback = heroMetrics.some((metric) =>
    metric.isFallback
  );
  const heroMetricsErrorMessage = heroMetricsError && heroMetricsErrorDetails
    ? heroMetricsErrorDetails.message
    : null;

  const providers = providerSummaries;
  const providerErrorMessage = providersError && providersErrorDetails
    ? providersErrorDetails.message
    : null;

  return (
    <Column
      as="main"
      fillWidth
      gap="64"
      align="start"
      horizontal="center"
      className="mx-auto w-full"
    >
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/"
        title={MULTI_LLM_TITLE}
        description={MULTI_LLM_DESCRIPTION}
        image={`/api/og/generate?title=${encodeURIComponent(MULTI_LLM_TITLE)}`}
        author={{
          name: person.name,
          url: `${baseURL}/about`,
          image: person.avatar,
        }}
      />

      <RevealFx translateY="16">
        <section
          id={HOME_NAV_SECTION_IDS.overview}
          data-section-anchor={HOME_NAV_SECTION_IDS.overview}
          className="w-full"
        >
          <Column
            fillWidth
            gap="32"
            paddingX="16"
            paddingTop="16"
            className="mx-auto max-w-6xl"
          >
            <Column gap="12" align="center" horizontal="center" maxWidth={48}>
              <Tag
                size="s"
                background="brand-alpha-weak"
                prefixIcon="sparkles"
              >
                Multi-LLM Studio
              </Tag>
              <Heading variant="display-strong-s" align="center">
                Orchestrate every provider from a single desk
              </Heading>
              <Text
                variant="body-default-l"
                onBackground="neutral-weak"
                align="center"
                wrap="balance"
              >
                Dynamic Capital&apos;s workspace routes prompts across OpenAI,
                Anthropic, and Groq with automated fallbacks, observability
                hooks, and mentor oversight.
              </Text>
            </Column>

            <Row
              gap="12"
              wrap
              horizontal="center"
              className="justify-center gap-3"
            >
              {HERO_BADGES.map((badge) => (
                <Row
                  key={badge.label}
                  gap="8"
                  paddingX="12"
                  paddingY="8"
                  radius="l"
                  border="brand-alpha-weak"
                  background="surface"
                  horizontal="center"
                  vertical="center"
                  data-border="rounded"
                  className="shadow-md shadow-brand/10"
                >
                  <Icon name={badge.icon} size="s" />
                  <Text variant="body-default-s" onBackground="neutral-strong">
                    {badge.label}
                  </Text>
                </Row>
              ))}
            </Row>

            <Row gap="16" wrap horizontal="center" className="gap-4">
              <Button
                size="m"
                href="/tools/multi-llm"
                variant="primary"
                data-border="rounded"
                arrowIcon
              >
                Launch the studio
              </Button>
              <Button
                size="m"
                href="/plans"
                variant="secondary"
                data-border="rounded"
              >
                Compare workspace plans
              </Button>
            </Row>

            <Row
              gap="16"
              wrap
              horizontal="center"
              className="gap-4"
            >
              {heroMetrics.map((metric) => (
                <Column
                  key={metric.label}
                  gap="12"
                  padding="16"
                  radius="l"
                  background="surface"
                  border="neutral-alpha-weak"
                  data-border="rounded"
                  className="min-w-[220px] flex-1 basis-48 bg-background/60 shadow-lg shadow-black/10"
                >
                  <Text
                    variant="label-default-s"
                    onBackground={metric.isFallback
                      ? "neutral-weak"
                      : "brand-medium"}
                    className="uppercase tracking-[0.18em]"
                  >
                    {metric.isFallback
                      ? "Awaiting live sync"
                      : "Live desk telemetry"}
                  </Text>
                  <Heading variant="heading-strong-m">{metric.value}</Heading>
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-weak"
                    wrap="balance"
                  >
                    {sentenceCase(metric.label)}
                  </Text>
                </Column>
              ))}
            </Row>
            {heroMetricsErrorMessage
              ? (
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  align="center"
                >
                  {heroMetricsErrorMessage}
                </Text>
              )
              : null}
            {heroMetricsUsingFallback
              ? (
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  align="center"
                >
                  Metrics fall back to the latest algorithm snapshot while live
                  telemetry syncs.
                </Text>
              )
              : (
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  align="center"
                >
                  Metrics refresh directly from the trading desk algorithms.
                </Text>
              )}
          </Column>
        </section>
      </RevealFx>

      <Section anchor={HOME_NAV_SECTION_IDS.providers} delay={0.12}>
        <Column gap="12" align="start">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="layers">
            Provider coverage
          </Tag>
          <Heading variant="display-strong-xs">
            Configure every vendor without juggling dashboards
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Mix premium APIs with emerging models. The workspace keeps latency,
            context limits, and pricing visible so you can pick the right model
            for every workload.
          </Text>
        </Column>
        {providers.length > 0
          ? (
            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => (
                <Column
                  key={provider.id}
                  gap="12"
                  padding="24"
                  radius="xl"
                  background="surface"
                  border="brand-alpha-weak"
                  data-border="rounded"
                  className="bg-background/70 shadow-xl shadow-brand/10"
                >
                  <Row gap="12" vertical="center" wrap>
                    <Icon
                      name={PROVIDER_ICON_MAP[provider.id] ?? "sparkles"}
                      size="m"
                    />
                    <Column>
                      <Heading variant="heading-strong-m">
                        {provider.name}
                      </Heading>
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        {provider.description}
                      </Text>
                    </Column>
                  </Row>
                  <Row gap="16" wrap className="gap-3 text-sm">
                    <BadgeStat
                      label="Default model"
                      value={provider.defaultModel}
                    />
                    <BadgeStat
                      label="Context window"
                      value={formatTokens(provider.contextWindow)}
                    />
                    <BadgeStat
                      label="Max output"
                      value={formatTokens(provider.maxOutputTokens)}
                    />
                  </Row>
                  <Text
                    variant="label-default-s"
                    onBackground={provider.configured
                      ? "brand-medium"
                      : "danger-strong"}
                    className="uppercase"
                  >
                    {provider.configured
                      ? "Configured in this workspace"
                      : "Add API key to enable"}
                  </Text>
                </Column>
              ))}
            </div>
          )
          : (
            <Column
              gap="12"
              padding="24"
              radius="l"
              background="surface"
              border="neutral-alpha-weak"
              data-border="rounded"
              className="bg-background/60 shadow-lg shadow-black/10"
            >
              <Text variant="body-default-m" onBackground="neutral-weak">
                {providersLoading
                  ? "Syncing provider coverage…"
                  : "Provider metadata is unavailable right now. Refresh to try again."}
              </Text>
              {providerErrorMessage
                ? (
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {providerErrorMessage}
                  </Text>
                )
                : null}
            </Column>
          )}
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.workflows} delay={0.18}>
        <Column gap="12" align="start">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="workflow">
            Routing intelligence
          </Tag>
          <Heading variant="display-strong-xs">
            Move from prompt to production policy in minutes
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Choose how the desk evaluates responses, when to escalate to
            mentors, and how to enforce safety rules—all without leaving the
            orchestrator.
          </Text>
        </Column>
        <div className="grid gap-4 md:grid-cols-2">
          {ROUTING_POLICIES.map((policy) => (
            <Column
              key={policy.title}
              gap="12"
              padding="24"
              radius="l"
              background="surface"
              border="neutral-alpha-weak"
              data-border="rounded"
              className="bg-background/60 shadow-lg shadow-black/10"
            >
              <Row gap="8" vertical="center">
                <Icon name={policy.icon} size="s" />
                <Heading variant="heading-strong-s">{policy.title}</Heading>
              </Row>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {policy.description}
              </Text>
            </Column>
          ))}
        </div>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.analytics} delay={0.24}>
        <Column gap="12" align="start">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="line-chart">
            Observability & benchmarks
          </Tag>
          <Heading variant="display-strong-xs">
            Evidence every decision with live analytics
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Track cost, latency, rubric scoring, and safety events from one
            dashboard. Export to your warehouse or mirror into the desk&apos;s
            funding review pipelines.
          </Text>
        </Column>
        <Row gap="16" wrap className="gap-4">
          {quickMetrics.map((metric) => (
            <Column
              key={metric.label}
              gap="8"
              padding="24"
              radius="l"
              background="surface"
              border="neutral-alpha-weak"
              data-border="rounded"
              className="min-w-[220px] flex-1 basis-48 bg-background/70 shadow-lg shadow-primary/10"
            >
              <Text
                variant="label-default-s"
                onBackground={metric.isFallback
                  ? "neutral-weak"
                  : "brand-medium"}
                className="uppercase"
              >
                {metric.isFallback ? "Awaiting live sync" : "Live analytics"}
              </Text>
              <Heading variant="heading-strong-l">{metric.value}</Heading>
              <Text
                variant="body-default-s"
                onBackground="neutral-weak"
                wrap="balance"
              >
                {sentenceCase(metric.label)}
              </Text>
              {metric.helperText
                ? (
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-weak"
                    wrap="balance"
                  >
                    {metric.helperText}
                  </Text>
                )
                : null}
            </Column>
          ))}
        </Row>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.security} delay={0.3}>
        <Column gap="12" align="start">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="shield">
            Trust & governance
          </Tag>
          <Heading variant="display-strong-xs">
            Keep compliance teams and stakeholders confident
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Workspace guardrails match institutional expectations—log every
            decision, protect secrets, and escalate to humans when judgment is
            required.
          </Text>
        </Column>
        <div className="grid gap-4 md:grid-cols-3">
          {RESILIENCE_PILLARS.map((pillar) => (
            <Column
              key={pillar.title}
              gap="12"
              padding="24"
              radius="l"
              background="surface"
              border="brand-alpha-weak"
              data-border="rounded"
              className="bg-background/60 shadow-lg shadow-brand/10"
            >
              <Row gap="8" vertical="center">
                <Icon name={pillar.icon} size="s" />
                <Heading variant="heading-strong-s">
                  {pillar.title}
                </Heading>
              </Row>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {pillar.description}
              </Text>
            </Column>
          ))}
        </div>
      </Section>

      <Section anchor={HOME_NAV_SECTION_IDS.onboarding} delay={0.36}>
        <Column gap="12" align="start">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="rocket">
            Onboarding
          </Tag>
          <Heading variant="display-strong-xs">
            Launch the orchestrator in under a week
          </Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            A dedicated desk concierge configures providers, routes, and
            playbooks so your team can focus on outcomes—not tooling.
          </Text>
        </Column>
        <div className="grid gap-4 md:grid-cols-2">
          {ONBOARDING_STEPS.map((step) => (
            <Column
              key={step.stage}
              gap="8"
              padding="24"
              radius="l"
              background="surface"
              border="neutral-alpha-weak"
              data-border="rounded"
              className="bg-background/70 shadow-lg shadow-black/10"
            >
              <Text
                variant="label-default-s"
                className="uppercase"
                onBackground="brand-medium"
              >
                {step.stage}
              </Text>
              <Heading variant="heading-strong-s">{step.title}</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {step.detail}
              </Text>
            </Column>
          ))}
        </div>
        <Row gap="16" wrap className="gap-4">
          <Button
            size="m"
            variant="primary"
            href="/checkout"
            data-border="rounded"
            arrowIcon
          >
            Reserve onboarding slot
          </Button>
          <Button
            size="m"
            variant="secondary"
            href="/support"
            data-border="rounded"
          >
            Chat with the desk team
          </Button>
        </Row>
      </Section>
    </Column>
  );
}

interface BadgeStatProps {
  label: string;
  value: string;
}

function BadgeStat({ label, value }: BadgeStatProps) {
  return (
    <Fragment>
      <Row
        gap="8"
        paddingX="12"
        paddingY="8"
        radius="l"
        border="neutral-alpha-weak"
        background="surface"
        data-border="rounded"
        className="text-sm font-medium"
      >
        <Text variant="body-default-s" onBackground="neutral-weak">
          {label}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-strong">
          {value}
        </Text>
      </Row>
    </Fragment>
  );
}

export default MultiLlmLandingPage;
