"use client";

import { type ReactNode, useState } from "react";

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
import { AboutShowcase } from "@/components/magic-portfolio/home/AboutShowcase";
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { ComplianceCertificates } from "@/components/magic-portfolio/home/ComplianceCertificates";
import { CommodityStrengthSection } from "@/components/magic-portfolio/home/CommodityStrengthSection";
import { CryptoStrengthSection } from "@/components/magic-portfolio/home/CryptoStrengthSection";
import { CurrencyStrengthSection } from "@/components/magic-portfolio/home/CurrencyStrengthSection";
import { EconomicCalendarSection } from "@/components/magic-portfolio/home/EconomicCalendarSection";
import { FundamentalAnalysisSection } from "@/components/magic-portfolio/home/FundamentalAnalysisSection";
import { FxMarketSnapshotSection } from "@/components/magic-portfolio/home/FxMarketSnapshotSection";
import { HeroExperience } from "@/components/magic-portfolio/home/HeroExperience";
import { IndexStrengthSection } from "@/components/magic-portfolio/home/IndexStrengthSection";
import { MentorshipProgramsSection } from "@/components/magic-portfolio/home/MentorshipProgramsSection";
import { LossRecoveryProgrammeSection } from "@/components/magic-portfolio/home/LossRecoveryProgrammeSection";
import { Mailchimp } from "@/components/magic-portfolio/Mailchimp";
import { MarketWatchlist } from "@/components/magic-portfolio/home/MarketWatchlist";
import { PerformanceInsightsSection } from "@/components/magic-portfolio/home/PerformanceInsightsSection";
import { PoolTradingSection } from "@/components/magic-portfolio/home/PoolTradingSection";
import { ValuePropositionSection } from "@/components/magic-portfolio/home/ValuePropositionSection";
import { VipPackagesSection } from "@/components/magic-portfolio/home/VipPackagesSection";
import { VipPlansPricingSection } from "@/components/magic-portfolio/home/VipPlansPricingSection";
import { cn } from "@/utils";
import { about, baseURL, home, person, toAbsoluteUrl } from "@/resources";
import { useHeroMetrics } from "@/hooks/useHeroMetrics";
import styles from "./DynamicCapitalLandingPage.module.scss";
import { HOME_NAV_SECTION_IDS } from "@/components/landing/home-navigation-config";

const EXPERIENCE_HIGHLIGHTS = [
  {
    icon: "sparkles" as const,
    title: "Automation that adapts",
    description:
      "A 45-second intake calibrates alerts, guardrails, and prep so every session opens ready to trade.",
    bullets: [
      "Dynamic agendas matched to your markets and timezone",
      "Risk locks and journaling automations pre-armed",
    ],
  },
  {
    icon: "users" as const,
    title: "Mentors on standby",
    description:
      "Desk leads review plans, run live drills, and answer questions without leaving the workspace.",
    bullets: [
      "Office hours and instant escalations inside the desk",
      "Cohorts grouped by objective for faster feedback",
    ],
  },
  {
    icon: "shield" as const,
    title: "Institutional guardrails",
    description:
      "Compliance-ready controls, SOC 2 aligned logging, and broker connectivity trusted by global teams.",
    bullets: [
      "Automated limits pause risk before breaches occur",
      "Reporting that satisfies fund and prop requirements",
    ],
  },
];

const JOURNEY_STEPS = [
  {
    label: "Day 1",
    title: "Calibrate your desk",
    description:
      "Intake syncs playbooks, alerts, and routines around your objective within minutes.",
  },
  {
    label: "Day 3",
    title: "Rehearse automation",
    description:
      "Mentor-led drills validate readiness scores while risk controls and journals auto-populate.",
  },
  {
    label: "Day 7",
    title: "Trade with guardrails",
    description:
      "Signals, reporting, and escalation paths activate once consistency targets are met.",
  },
];

const MARKET_FEATURES = [
  "Realtime watchlists annotated by analysts",
  "FX posture and correlations refreshed every hour",
  "Economic calendar synced to your trading windows",
];

const MENTOR_FEATURES = [
  "Weekly performance reviews with actionable follow-ups",
  "Direct chat escalation to mentors in under two minutes",
  "Specialist cohorts for founders, funds, and operators",
];

const AUTOMATION_METRICS = [
  {
    label: "Automations active",
    value: "47",
    description: "covering prep, execution, and post-trade routines",
  },
  {
    label: "Sync cadence",
    value: "12m",
    description: "data refresh interval across brokers and journals",
  },
  {
    label: "Manual imports",
    value: "0",
    description: "your workspace stays current without spreadsheets",
  },
];

const AUTOMATION_GUARDRAILS = [
  {
    icon: "sparkles" as const,
    title: "Calibration that adapts",
    description:
      "Intake answers update playbooks, agendas, and risk presets automatically so every session starts aligned with your objective.",
  },
  {
    icon: "shield" as const,
    title: "Risk locks on autopilot",
    description:
      "Position limits, drawdown governors, and break alerts trip before mistakes compound, with mentors looped in instantly.",
  },
  {
    icon: "timer" as const,
    title: "Reviews on schedule",
    description:
      "Automation posts end-of-day recaps, pulls journal highlights, and queues mentor reviews without you prompting it.",
  },
];

const AUTOMATION_RHYTHM = [
  {
    time: "06:00",
    label: "Session warm-up",
    description:
      "Catalysts, risk posture, and focus tasks publish before London open so you can review in minutes.",
  },
  {
    time: "12:30",
    label: "Midday pulse",
    description:
      "Automation validates adherence scores, nudges overdue checklists, and opens mentor threads when something slips.",
  },
  {
    time: "18:45",
    label: "Close-out sync",
    description:
      "Trade logs, screenshots, and journal notes consolidate into a single package ready for funding or compliance review.",
  },
];

const TRUST_MARKS = [
  {
    icon: "shield" as const,
    title: "Compliance-first",
    description:
      "SOC 2 aligned logging, encrypted archives, and role-based access baked into every workflow.",
  },
  {
    icon: "globe" as const,
    title: "Global coverage",
    description:
      "London, Dubai, and Singapore desks keep sessions live across all major market opens.",
  },
  {
    icon: "grid" as const,
    title: "Tier-1 connectivity",
    description:
      "Direct integrations with regulated liquidity partners and broker APIs for institutional routing.",
  },
];

const SERVICES = [
  {
    id: "desk-intake",
    icon: "sparkles" as const,
    name: "Desk Intake",
    tagline: "Calibrate your 90-day desk roadmap in minutes.",
    description:
      "Complete a guided intake to map objectives, accounts, and risk rules. The desk returns a documented plan before your next session.",
    ctaLabel: "Start the intake",
    ctaHref: "#begin",
  },
  {
    id: "automation-ops",
    icon: "radar" as const,
    name: "Automation Ops",
    tagline: "Guardrails that keep preparation and review on rails.",
    description:
      "Daily automations sync journals, risk locks, and alerts so your workflow runs itself. Inspect or adjust every routine from one place.",
    ctaLabel: "Review automations",
    ctaHref: "#automation-workflows",
  },
  {
    id: "mentor-bridge",
    icon: "users" as const,
    name: "Mentor Bridge",
    tagline: "Specialists on call for drills, teardowns, and approvals.",
    description:
      "Escalate questions, join office hours, or request a plan teardown without leaving the workspace. Mentors answer with annotated playbooks.",
    ctaLabel: "Meet the mentors",
    ctaHref: "#mentorship-programs",
  },
  {
    id: "loss-recovery",
    icon: "shield" as const,
    name: "Loss Recovery Programme",
    tagline: "Risk-first turnaround plans for disciplined traders.",
    description:
      "Submit read-only performance history for an audit, then partner with senior strategists to reset risk and rebuild execution.",
    ctaLabel: "Explore the programme",
    ctaHref: "#loss-recovery",
  },
  {
    id: "capital-bridge",
    icon: "rocket" as const,
    name: "Capital Bridge",
    tagline: "Trade live once readiness is verified by the desk.",
    description:
      "When automation scores clear the threshold, we route you to vetted funding partners and manage the handoff into production accounts.",
    ctaLabel: "Prepare for funding",
    ctaHref: "#funding-readiness",
  },
] as const;

const FUNDING_METRICS = [
  {
    label: "Capital activated",
    value: "$250K",
    description: "pooled across our prop, fund, and broker partners",
  },
  {
    label: "Readiness threshold",
    value: "85%",
    description: "automation score required to unlock live funding",
  },
  {
    label: "Turnaround",
    value: "72 hrs",
    description: "median time from review to account go-live",
  },
];

const FUNDING_STEPS = [
  {
    title: "Submit your trading dossier",
    description:
      "Upload journal exports or connect your broker so the desk ingests risk metrics instantly.",
  },
  {
    title: "Automated readiness review",
    description:
      "Risk, psychology, and execution scores combine into a single readiness index mentors can validate in real time.",
  },
  {
    title: "Capital deployment & scaling",
    description:
      "Start with capital aligned to your limits, then scale as dashboards prove consistency each week.",
  },
];

const FUNDING_SUPPORT = [
  "Structured drawdown protections to preserve capital during scale up",
  "Mentor escalation paths with direct slack to partner risk teams",
  "Weekly portfolio reviews to unlock higher tiers without renegotiation",
];

export function DynamicCapitalLandingPage() {
  return (
    <Column
      as="main"
      fillWidth
      gap="xl"
      horizontal="center"
      className={styles.page}
    >
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={home.path}
        title={home.title}
        description={home.description}
        image={`/api/og/generate?title=${encodeURIComponent(home.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: toAbsoluteUrl(baseURL, person.avatar),
        }}
      />
      <Section variant="wide" reveal={false}>
        <HeroExperience />
      </Section>
      <Section
        revealDelay={0.24}
        anchor={{
          id: HOME_NAV_SECTION_IDS.overview,
          ariaLabel: "Platform overview",
        }}
      >
        <ValuePropositionSection />
      </Section>
      <Section revealDelay={0.32}>
        <ServicesOverviewSection />
      </Section>
      <Section revealDelay={0.4}>
        <ExperienceHighlightsSection />
      </Section>
      <Section revealDelay={0.48}>
        <PerformanceInsightsSection />
      </Section>
      <Section revealDelay={0.56}>
        <AutomationWorkflowSection />
      </Section>
      <Section
        variant="wide"
        revealDelay={0.64}
        anchor={{
          id: HOME_NAV_SECTION_IDS.markets,
          ariaLabel: "Market intelligence",
        }}
      >
        <MarketIntelligenceSection />
      </Section>
      <Section variant="wide" revealDelay={0.72}>
        <CommodityStrengthSection />
      </Section>
      <Section variant="wide" revealDelay={0.8}>
        <CurrencyStrengthSection />
      </Section>
      <Section variant="wide" revealDelay={0.88}>
        <IndexStrengthSection />
      </Section>
      <Section variant="wide" revealDelay={0.96}>
        <CryptoStrengthSection />
      </Section>
      <Section revealDelay={1.04}>
        <FundamentalAnalysisSection />
      </Section>
      <Section
        revealDelay={1.12}
        anchor={{
          id: HOME_NAV_SECTION_IDS.community,
          ariaLabel: "Mentorship programmes",
        }}
      >
        <MentorshipProgramsSection />
      </Section>
      <Section revealDelay={1.2}>
        <LossRecoveryProgrammeSection />
      </Section>
      <Section
        revealDelay={1.28}
        anchor={{
          id: HOME_NAV_SECTION_IDS.miniApp,
          ariaLabel: "Membership plans",
        }}
      >
        <VipPlansPricingSection />
      </Section>
      <Section revealDelay={1.36}>
        <VipPackagesSection />
      </Section>
      <Section revealDelay={1.44}>
        <MentorAndTrustSection />
      </Section>
      <Section revealDelay={1.52}>
        <PoolTradingSection />
      </Section>
      <Section
        revealDelay={1.6}
        anchor={{
          id: HOME_NAV_SECTION_IDS.admin,
          ariaLabel: "Trust and compliance",
        }}
      >
        <ComplianceCertificates />
      </Section>
      <Section revealDelay={1.68}>
        <FundingReadinessSection />
      </Section>
      <Section
        revealDelay={1.76}
        anchor={{
          id: HOME_NAV_SECTION_IDS.advantages,
          ariaLabel: "Get started with Dynamic Capital",
        }}
      >
        <CheckoutCallout />
      </Section>
      <Section revealDelay={1.84}>
        <AboutShowcase />
      </Section>
      <Section reveal={false}>
        <Mailchimp className={styles.card} />
      </Section>
    </Column>
  );
}

type SectionVariant = "compact" | "wide";

interface SectionAnchor {
  id: string;
  ariaLabel?: string;
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  reveal?: boolean;
  revealDelay?: number;
  variant?: SectionVariant;
  anchor?: SectionAnchor;
}

function Section({
  children,
  className,
  reveal = true,
  revealDelay,
  variant = "compact",
  anchor,
}: SectionProps) {
  const variantClassName = variant === "wide"
    ? styles.sectionWide
    : styles.sectionCompact;
  const SectionComponent = (anchor ? "section" : "div") as "section" | "div";
  const section = (
    <SectionComponent
      id={anchor?.id}
      aria-label={anchor?.ariaLabel}
      data-section-anchor={anchor?.id}
      className={cn(styles.section, variantClassName, className)}
    >
      {children}
    </SectionComponent>
  );

  if (!reveal) {
    return section;
  }

  return (
    <RevealFx translateY="16" delay={revealDelay}>
      {section}
    </RevealFx>
  );
}

function ServicesOverviewSection() {
  const [activeService, setActiveService] = useState<string | null>(null);

  const activate = (serviceId: string) => {
    setActiveService(serviceId);
  };

  const deactivate = (serviceId: string) => {
    setActiveService((current) => (current === serviceId ? null : current));
  };

  const toggle = (serviceId: string) => {
    setActiveService((current) => (current === serviceId ? null : serviceId));
  };

  return (
    <Column fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="compass">
          Services overview
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Navigate every Dynamic Capital service from a single hub
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Hover or focus each card to flip it, learn what the service unlocks,
          and jump directly into the experience that fits your next move.
        </Text>
      </Column>
      <div className={styles.servicesGrid}>
        {SERVICES.map((service) => {
          const isActive = activeService === service.id;

          return (
            <div
              key={service.id}
              className={cn(
                styles.serviceCard,
                isActive && styles.serviceCardActive,
              )}
              role="button"
              tabIndex={0}
              aria-expanded={isActive}
              onPointerEnter={() => activate(service.id)}
              onPointerLeave={() => deactivate(service.id)}
              onFocusCapture={() => activate(service.id)}
              onBlurCapture={(event) => {
                const nextFocusTarget = event.relatedTarget as Node | null;

                if (
                  !nextFocusTarget ||
                  !event.currentTarget.contains(nextFocusTarget)
                ) {
                  deactivate(service.id);
                }
              }}
              onClick={(event) => {
                const targetElement = (event.target as HTMLElement | null)
                  ?.closest(
                    "a,button",
                  );

                if (targetElement && targetElement !== event.currentTarget) {
                  return;
                }

                event.preventDefault();
                toggle(service.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(service.id);
                }
              }}
            >
              <div className={styles.serviceCardInner}>
                <Column
                  background="surface"
                  border="neutral-alpha-weak"
                  radius="l"
                  padding="xl"
                  gap="16"
                  align="start"
                  className={cn(styles.card, styles.cardFace, styles.cardFront)}
                  aria-hidden={isActive}
                >
                  <Row gap="12" vertical="center">
                    <Icon name={service.icon} onBackground="brand-medium" />
                    <Heading variant="heading-strong-m">{service.name}</Heading>
                  </Row>
                  <Text
                    variant="body-default-m"
                    onBackground="neutral-weak"
                    wrap="balance"
                  >
                    {service.tagline}
                  </Text>
                </Column>
                <Column
                  background="brand-alpha-weak"
                  border="brand-alpha-medium"
                  radius="l"
                  padding="xl"
                  gap="20"
                  align="start"
                  className={cn(styles.card, styles.cardFace, styles.cardBack)}
                  aria-hidden={!isActive}
                >
                  <Column gap="12" align="start">
                    <Heading variant="heading-strong-m" wrap="balance">
                      {service.name}
                    </Heading>
                    <Text
                      variant="body-default-m"
                      onBackground="brand-weak"
                      wrap="balance"
                    >
                      {service.description}
                    </Text>
                  </Column>
                  <Button
                    href={service.ctaHref}
                    size="m"
                    variant="secondary"
                    data-border="rounded"
                    arrowIcon
                  >
                    {service.ctaLabel}
                  </Button>
                </Column>
              </div>
            </div>
          );
        })}
      </div>
    </Column>
  );
}

function ExperienceHighlightsSection() {
  const { quickMetrics } = useHeroMetrics();

  return (
    <Column fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          Built for disciplined, modern operators
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Everything you need to prep, rehearse, and execute in one streamlined
          desk
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Dynamic Capital merges automation, coaching, and market context so you
          can move from idea to live trade without juggling disconnected tools.
        </Text>
      </Column>
      <div className={styles.statGrid}>
        {quickMetrics.map((metric) => (
          <Column
            key={metric.label}
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            padding="l"
            gap="12"
            className={styles.card}
            align="start"
          >
            <Row gap="12" vertical="center">
              <Icon name={metric.icon} onBackground="brand-medium" />
              <Heading
                variant="display-strong-xs"
                className={cn(metric.isFallback && "animate-pulse")}
              >
                {metric.value}
              </Heading>
            </Row>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {metric.label}
            </Text>
            {metric.helperText
              ? (
                <Text
                  variant="label-default-s"
                  onBackground="neutral-weak"
                >
                  {metric.helperText}
                </Text>
              )
              : null}
          </Column>
        ))}
      </div>
      <div className={styles.featureGrid}>
        {EXPERIENCE_HIGHLIGHTS.map((highlight) => (
          <Column
            key={highlight.title}
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            padding="xl"
            gap="16"
            className={styles.card}
            align="start"
          >
            <Row gap="12" vertical="center">
              <Icon name={highlight.icon} onBackground="brand-medium" />
              <Heading variant="heading-strong-m">{highlight.title}</Heading>
            </Row>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
            >
              {highlight.description}
            </Text>
            <Column as="ul" gap="12" align="start" className={styles.pillList}>
              {highlight.bullets.map((bullet) => (
                <Row
                  as="li"
                  key={bullet}
                  gap="8"
                  vertical="start"
                  align="start"
                >
                  <Icon name="check" onBackground="brand-medium" />
                  <Text as="span" variant="body-default-m">
                    {bullet}
                  </Text>
                </Row>
              ))}
            </Column>
          </Column>
        ))}
      </div>
      <div className={styles.journeyStrip}>
        {JOURNEY_STEPS.map((step, index) => (
          <Column
            key={step.title}
            background="brand-alpha-weak"
            border="brand-alpha-medium"
            radius="l"
            padding="l"
            gap="12"
            className={styles.card}
            align="start"
          >
            <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
              Step {String(index + 1).padStart(2, "0")}
            </Tag>
            <Heading variant="heading-strong-m">{step.title}</Heading>
            <Text variant="label-default-s" onBackground="brand-weak">
              {step.label}
            </Text>
            <Text
              variant="body-default-m"
              onBackground="brand-weak"
              wrap="balance"
            >
              {step.description}
            </Text>
          </Column>
        ))}
      </div>
    </Column>
  );
}

function AutomationWorkflowSection() {
  return (
    <Column id="automation-workflows" fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          Automation guardrails
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Stay focused on decisions while the desk runs the routine
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Automations keep prep, execution, and review synchronized. You handle
          the trade decisions; the desk makes sure everything around them is
          ready.
        </Text>
      </Column>
      <div className={styles.featureGrid}>
        <Column
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="xl"
          gap="16"
          className={styles.card}
          align="start"
        >
          <Heading variant="heading-strong-m">What stays on autopilot</Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            wrap="balance"
          >
            Metrics refresh continuously so you never wonder whether data or
            guardrails are current.
          </Text>
          <div className={styles.metricStack}>
            {AUTOMATION_METRICS.map((metric) => (
              <Column key={metric.label} gap="4" align="start">
                <Heading variant="display-strong-xs">{metric.value}</Heading>
                <Text variant="label-default-s" onBackground="neutral-weak">
                  {metric.label}
                </Text>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {metric.description}
                </Text>
              </Column>
            ))}
          </div>
        </Column>
        <Column
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="xl"
          gap="16"
          className={styles.card}
          align="start"
        >
          <Heading variant="heading-strong-m" wrap="balance">
            Guardrails that adapt with you
          </Heading>
          <Column gap="16" align="start">
            {AUTOMATION_GUARDRAILS.map((guardrail) => (
              <Column key={guardrail.title} gap="8" align="start">
                <Row gap="12" vertical="center">
                  <Icon name={guardrail.icon} onBackground="brand-medium" />
                  <Heading variant="heading-strong-s" wrap="balance">
                    {guardrail.title}
                  </Heading>
                </Row>
                <Text
                  variant="body-default-m"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {guardrail.description}
                </Text>
              </Column>
            ))}
          </Column>
        </Column>
        <Column
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="xl"
          gap="16"
          className={styles.card}
          align="start"
        >
          <Heading variant="heading-strong-m" wrap="balance">
            Daily rhythm inside the desk
          </Heading>
          <Column as="ol" gap="12" align="start" className={styles.stepList}>
            {AUTOMATION_RHYTHM.map((step, index) => (
              <Column
                as="li"
                key={step.label}
                background="brand-alpha-weak"
                border="brand-alpha-medium"
                radius="l"
                padding="l"
                gap="8"
                align="start"
              >
                <Row gap="8" vertical="center">
                  <Tag size="s" background="brand-alpha-weak">
                    {String(index + 1).padStart(2, "0")} · {step.time}
                  </Tag>
                  <Heading variant="heading-strong-s">{step.label}</Heading>
                </Row>
                <Text
                  variant="body-default-m"
                  onBackground="brand-weak"
                  wrap="balance"
                >
                  {step.description}
                </Text>
              </Column>
            ))}
          </Column>
        </Column>
      </div>
    </Column>
  );
}

function MarketIntelligenceSection() {
  return (
    <Column fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          Live market intelligence
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Always-on coverage that keeps you calibrated to the next catalyst
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          From curated watchlists to macro posture and event risk, the desk
          surfaces what matters before you even ask.
        </Text>
      </Column>
      <div className={styles.marketGrid}>
        <Column
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="xl"
          gap="16"
          className={styles.card}
          align="start"
        >
          <Heading variant="heading-strong-m">
            Coverage that moves with the market
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            wrap="balance"
          >
            Real-time intel is layered directly into your workspace so you can
            stay in flow while the desk tracks the macro picture for you.
          </Text>
          <Column as="ul" gap="12" align="start">
            {MARKET_FEATURES.map((feature) => (
              <Row
                as="li"
                key={feature}
                gap="8"
                vertical="start"
                align="start"
              >
                <Icon name="sparkles" onBackground="brand-medium" />
                <Text as="span" variant="body-default-m">
                  {feature}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
        <Column gap="16" className={styles.card}>
          <MarketWatchlist />
        </Column>
        <Column gap="16" className={styles.card}>
          <FxMarketSnapshotSection />
          <EconomicCalendarSection />
        </Column>
      </div>
    </Column>
  );
}

function MentorAndTrustSection() {
  return (
    <div className={styles.splitGrid}>
      <Column
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="xl"
        gap="16"
        className={styles.card}
        align="start"
      >
        <Tag size="s" background="brand-alpha-weak" prefixIcon="users">
          Human expertise, on demand
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Mentors, cohorts, and reviews built into your routine
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Stay accountable with people who trade the same playbooks you do.
          Whether you need a teardown or a fast gut-check, support is a click
          away.
        </Text>
        <Column as="ul" gap="12" align="start">
          {MENTOR_FEATURES.map((item) => (
            <Row as="li" key={item} gap="8" vertical="start" align="start">
              <Icon name="check" onBackground="brand-medium" />
              <Text as="span" variant="body-default-m">
                {item}
              </Text>
            </Row>
          ))}
        </Column>
      </Column>
      <Column
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="xl"
        gap="16"
        className={styles.card}
        align="start"
      >
        <Tag size="s" background="brand-alpha-weak" prefixIcon="shield">
          Trust the infrastructure
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Enterprise-grade controls without the enterprise drag
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Dynamic Capital is engineered with compliance teams in mind so you can
          scale without introducing operational friction.
        </Text>
        <Column gap="16" align="start">
          {TRUST_MARKS.map((mark) => (
            <Column key={mark.title} gap="8" align="start">
              <Row gap="12" vertical="center">
                <Icon name={mark.icon} onBackground="brand-medium" />
                <Heading variant="heading-strong-s">{mark.title}</Heading>
              </Row>
              <Text
                variant="body-default-m"
                onBackground="neutral-weak"
                wrap="balance"
              >
                {mark.description}
              </Text>
            </Column>
          ))}
        </Column>
      </Column>
    </div>
  );
}

function FundingReadinessSection() {
  return (
    <Column id="funding-readiness" fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="rocket">
          Funding that matches your discipline
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Unlock institutional capital once the desk verifies you are ready
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          When your automation score crosses the readiness threshold, Dynamic
          Capital connects you to vetted funding partners without leaving the
          workspace.
        </Text>
      </Column>
      <div className={styles.fundingGrid}>
        <Column
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="xl"
          gap="16"
          className={styles.card}
          align="start"
        >
          <Heading variant="heading-strong-m">
            Proof-backed capital within days
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            wrap="balance"
          >
            Funding allocations scale with the same risk signals that keep your
            desk in flow. The moment mentors clear you, capital routes directly
            to the connected broker.
          </Text>
          <div className={styles.metricStack}>
            {FUNDING_METRICS.map((metric) => (
              <Column key={metric.label} gap="4" align="start">
                <Heading variant="display-strong-xs">{metric.value}</Heading>
                <Text variant="label-default-s" onBackground="neutral-weak">
                  {metric.label}
                </Text>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {metric.description}
                </Text>
              </Column>
            ))}
          </div>
          <Column as="ul" gap="12" align="start" className={styles.pillList}>
            {FUNDING_SUPPORT.map((item) => (
              <Row as="li" key={item} gap="8" vertical="start" align="start">
                <Icon name="check" onBackground="brand-medium" />
                <Text as="span" variant="body-default-m">
                  {item}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
        <Column gap="16" align="start" className={styles.card}>
          <Column gap="12" align="start">
            <Tag size="s" background="brand-alpha-weak" prefixIcon="timer">
              Streamlined readiness review
            </Tag>
            <Heading variant="heading-strong-m" wrap="balance">
              Three verified steps between you and live trading capital
            </Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
            >
              Every milestone is tracked, timestamped, and shareable so you can
              document your progression to investors and partners in minutes.
            </Text>
          </Column>
          <Column as="ol" gap="12" align="start" className={styles.stepList}>
            {FUNDING_STEPS.map((step, index) => (
              <Column
                as="li"
                key={step.title}
                background="surface"
                border="brand-alpha-weak"
                radius="l"
                padding="l"
                gap="8"
                align="start"
              >
                <Row gap="8" vertical="center">
                  <Tag size="s" background="brand-alpha-weak">
                    {String(index + 1).padStart(2, "0")}
                  </Tag>
                  <Heading variant="heading-strong-s">{step.title}</Heading>
                </Row>
                <Text
                  variant="body-default-m"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {step.description}
                </Text>
              </Column>
            ))}
          </Column>
        </Column>
      </div>
    </Column>
  );
}
