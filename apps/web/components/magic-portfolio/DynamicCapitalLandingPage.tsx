import { type ReactNode } from "react";

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
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { EconomicCalendarSection } from "@/components/magic-portfolio/home/EconomicCalendarSection";
import { FxMarketSnapshotSection } from "@/components/magic-portfolio/home/FxMarketSnapshotSection";
import { HeroExperience } from "@/components/magic-portfolio/home/HeroExperience";
import { Mailchimp } from "@/components/magic-portfolio/Mailchimp";
import { MarketWatchlist } from "@/components/magic-portfolio/home/MarketWatchlist";
import { cn } from "@/utils";
import { about, baseURL, home, person, toAbsoluteUrl } from "@/resources";
import { TELEGRAM_CONFIG } from "@/config/supabase";
import styles from "./DynamicCapitalLandingPage.module.scss";

const QUICK_METRICS = [
  {
    icon: "timer" as const,
    value: "12 days",
    label: "median time to unlock live signals",
  },
  {
    icon: "target" as const,
    value: "91%",
    label: "playbook adherence once automation is active",
  },
  {
    icon: "sparkles" as const,
    value: "4.9/5",
    label: "mentor satisfaction from active members",
  },
];

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

const BEGINNER_LAUNCHPAD = [
  {
    icon: "sparkles" as const,
    title: "Orientation playlist",
    description:
      "Interactive walk-throughs introduce the desk, terminology, and core risk concepts so new traders know exactly where to start.",
    outcomes: [
      "Guided setup inside the first 10 minutes",
      "Plain-language glossary for every signal",
      "Hands-on checkpoints after each lesson",
    ],
  },
  {
    icon: "target" as const,
    title: "Practice labs",
    description:
      "Simulated sessions mirror the live environment, letting beginners rehearse orders and journaling before capital is involved.",
    outcomes: [
      "Replayable drills with mentor commentary",
      "Auto-graded readiness scorecards",
      "Bookmarkable strategies for quick refreshers",
    ],
  },
  {
    icon: "users" as const,
    title: "Ask-anything channel",
    description:
      "Desk mentors are on-call to answer questions, review your plan, or suggest the next module directly inside Telegram.",
    outcomes: [
      "Real humans guiding every checkpoint",
      "Weekly office hours tailored to your level",
      "Instant escalation to specialists when needed",
    ],
  },
];

const INVESTOR_METRICS = [
  {
    value: "+18.4%",
    label: "Average 90-day ROI from active desks",
  },
  {
    value: "12 hrs",
    label: "Median time between vetted trade ideas",
  },
  {
    value: "98.7%",
    label: "Automation uptime across portfolio workflows",
  },
];

const INTEGRATION_TOUCHPOINTS = {
  bot: {
    icon: "users" as const,
    title: "Telegram Bot",
    description:
      "Receive market flashes, readiness nudges, and direct mentor replies in the channel where you already collaborate.",
    actions: [
      "Daily prep checklist delivered to your chat",
      "Instant escalation when risk thresholds trigger",
      "One-tap broadcast of new trade ideas to your team",
    ],
  },
  miniApp: {
    icon: "sparkles" as const,
    title: "Dynamic Mini App",
    description:
      "Launch the glass-mode console for deposits, funding requests, and live dashboards backed by the same Supabase automations.",
    actions: [
      "Secure checkout and subscription management",
      "ROI dashboards synced with the trading desk",
      "On-demand access to your verified documentation",
    ],
  },
};

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
      <Section revealDelay={0.32}>
        <BeginnerLaunchpadSection />
      </Section>
      <Section revealDelay={0.4}>
        <ExperienceHighlightsSection />
      </Section>
      <Section variant="wide" revealDelay={0.48}>
        <MarketIntelligenceSection />
      </Section>
      <Section revealDelay={0.56}>
        <MentorAndTrustSection />
      </Section>
      <Section revealDelay={0.64}>
        <FundingReadinessSection />
      </Section>
      <Section revealDelay={0.72}>
        <CheckoutCallout />
      </Section>
      <Section revealDelay={0.8}>
        <MiniAppIntegrationSection />
      </Section>
      <Section reveal={false}>
        <Mailchimp className={styles.card} />
      </Section>
    </Column>
  );
}

type SectionVariant = "compact" | "wide";

interface SectionProps {
  children: ReactNode;
  className?: string;
  reveal?: boolean;
  revealDelay?: number;
  variant?: SectionVariant;
}

function Section({
  children,
  className,
  reveal = true,
  revealDelay,
  variant = "compact",
}: SectionProps) {
  const variantClassName = variant === "wide"
    ? styles.sectionWide
    : styles.sectionCompact;
  const section = (
    <div className={cn(styles.section, variantClassName, className)}>
      {children}
    </div>
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

function ExperienceHighlightsSection() {
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
        {QUICK_METRICS.map((metric) => (
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
              <Heading variant="display-strong-xs">{metric.value}</Heading>
            </Row>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {metric.label}
            </Text>
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

function BeginnerLaunchpadSection() {
  return (
    <Column fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          New to Dynamic Capital
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          A guided launchpad that helps beginners learn, rehearse, and explore
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Navigate the first weeks with interactive lessons, mentor-led drills,
          and a human support loop designed to build confidence before live
          capital is at stake.
        </Text>
      </Column>
      <div className={styles.learningGrid}>
        {BEGINNER_LAUNCHPAD.map((item) => (
          <Column
            key={item.title}
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            padding="xl"
            gap="16"
            className={styles.card}
            align="start"
          >
            <Row gap="12" vertical="center">
              <Icon name={item.icon} onBackground="brand-medium" />
              <Heading variant="heading-strong-m">{item.title}</Heading>
            </Row>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              wrap="balance"
            >
              {item.description}
            </Text>
            <Column as="ul" gap="12" align="start" className={styles.pillList}>
              {item.outcomes.map((outcome) => (
                <Row
                  as="li"
                  key={outcome}
                  gap="8"
                  vertical="start"
                  align="start"
                >
                  <Icon name="check" onBackground="brand-medium" />
                  <Text as="span" variant="body-default-m">
                    {outcome}
                  </Text>
                </Row>
              ))}
            </Column>
          </Column>
        ))}
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
          Investor-grade coverage, ROI signals, and automation in one control
          center
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          From curated watchlists to macro posture and event risk, the desk
          surfaces what matters before you even ask — complete with the
          performance telemetry investors expect when allocating capital.
        </Text>
      </Column>
      <div className={styles.metricRow}>
        {INVESTOR_METRICS.map((metric) => (
          <Column
            key={metric.label}
            background="surface"
            border="brand-alpha-weak"
            radius="l"
            padding="l"
            gap="8"
            className={styles.card}
            align="start"
          >
            <Heading variant="display-strong-xs">{metric.value}</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {metric.label}
            </Text>
          </Column>
        ))}
      </div>
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
    <Column fillWidth gap="24" align="start">
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

function MiniAppIntegrationSection() {
  const { BOT_URL, MINI_APP_URL } = TELEGRAM_CONFIG;

  return (
    <Column fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          Stay connected everywhere
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Mini App and Telegram Bot work in lockstep to keep traders and
          investors aligned
        </Heading>
        <Text
          variant="body-default-l"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Trigger automations, review funding performance, and escalate to
          mentors without leaving your preferred surface.
        </Text>
      </Column>
      <div className={styles.ctaGrid}>
        <Column
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="xl"
          gap="16"
          className={styles.card}
          align="start"
        >
          <Row gap="12" vertical="center">
            <Icon
              name={INTEGRATION_TOUCHPOINTS.bot.icon}
              onBackground="brand-medium"
            />
            <Heading variant="heading-strong-m">
              {INTEGRATION_TOUCHPOINTS.bot.title}
            </Heading>
          </Row>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            wrap="balance"
          >
            {INTEGRATION_TOUCHPOINTS.bot.description}
          </Text>
          <Column as="ul" gap="12" align="start" className={styles.pillList}>
            {INTEGRATION_TOUCHPOINTS.bot.actions.map((action) => (
              <Row as="li" key={action} gap="8" vertical="start" align="start">
                <Icon name="check" onBackground="brand-medium" />
                <Text as="span" variant="body-default-m">
                  {action}
                </Text>
              </Row>
            ))}
          </Column>
          <Row gap="12" className={styles.ctaActions}>
            <Button
              href={BOT_URL}
              size="m"
              variant="secondary"
              data-border="rounded"
              prefixIcon="telegram"
              target="_blank"
              rel="noreferrer"
            >
              Message the Telegram bot
            </Button>
          </Row>
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
          <Row gap="12" vertical="center">
            <Icon
              name={INTEGRATION_TOUCHPOINTS.miniApp.icon}
              onBackground="brand-medium"
            />
            <Heading variant="heading-strong-m">
              {INTEGRATION_TOUCHPOINTS.miniApp.title}
            </Heading>
          </Row>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            wrap="balance"
          >
            {INTEGRATION_TOUCHPOINTS.miniApp.description}
          </Text>
          <Column as="ul" gap="12" align="start" className={styles.pillList}>
            {INTEGRATION_TOUCHPOINTS.miniApp.actions.map((action) => (
              <Row as="li" key={action} gap="8" vertical="start" align="start">
                <Icon name="check" onBackground="brand-medium" />
                <Text as="span" variant="body-default-m">
                  {action}
                </Text>
              </Row>
            ))}
          </Column>
          <Row gap="12" className={styles.ctaActions}>
            <Button
              href={MINI_APP_URL}
              size="m"
              variant="secondary"
              data-border="rounded"
              prefixIcon="sparkles"
              target="_blank"
              rel="noreferrer"
            >
              Launch the Mini App
            </Button>
          </Row>
        </Column>
      </div>
    </Column>
  );
}
