"use client";

import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { SignalsWidget } from "@/components/trading/SignalsWidget";
import { StrengthMeter } from "@/components/trading/StrengthMeter";
import { WalletCard } from "@/components/trading/WalletCard";
import { Card } from "@/components/ui/card";
import { DeskSection } from "@/components/workspaces/DeskSection";
import {
  WORKSPACE_MOBILE_CARD,
  WORKSPACE_MOBILE_RAIL_CONTAINER,
  WORKSPACE_MOBILE_RAIL_PADDING,
} from "@/components/workspaces/workspace-mobile";
import { cn } from "@/utils";

interface ProgressMetric {
  id: string;
  label: string;
  value: string;
  description: string;
}

const PROGRESS_METRICS: ProgressMetric[] = [
  {
    id: "sessions-logged",
    label: "Sessions logged",
    value: "42 this month",
    description:
      "Auto-ingested from the trade journal to benchmark consistency and desk participation.",
  },
  {
    id: "win-rate",
    label: "Desk win rate",
    value: "63% trailing 7 days",
    description:
      "Aggregated from connected accounts with risk-adjusted scoring so mentors know where to focus feedback.",
  },
  {
    id: "playbook-reviews",
    label: "Playbook reviews",
    value: "3 pending",
    description:
      "Open mentor comments waiting for acknowledgement before the next trading session starts.",
  },
];

interface CadenceModule {
  id: string;
  title: string;
  cadence: string;
  description: string;
  bullets: string[];
}

const LEARNING_TRACKS: CadenceModule[] = [
  {
    id: "foundations",
    title: "Foundations & risk discipline",
    cadence: "Self-paced modules",
    description:
      "Install the guardrails every trader follows before sizing their first live position.",
    bullets: [
      "Pre-trade checklist covering bias, risk per trade, and session conditions.",
      "Annotated playbook library for FX, metals, and index setups.",
      "Glossary and scoring rubric to grade signal quality and execution discipline.",
    ],
  },
  {
    id: "execution",
    title: "Execution acceleration",
    cadence: "Weekly mentor cadence",
    description:
      "Pair live desk signals with accountability loops that keep trade quality high.",
    bullets: [
      "Live market briefs with priority levels and invalidation triggers.",
      "Scenario planning drills to rehearse news events and volatility shocks.",
      "Trade replay prompts that compress lessons into shareable recaps.",
    ],
  },
  {
    id: "automation",
    title: "Automation & analytics",
    cadence: "Project-based",
    description:
      "Wire reporting, notifications, and liquidity bridges so repetition scales instead of breaking.",
    bullets: [
      "Dynamic CLI/CD blueprints for telemetry exports and playbook updates.",
      "Supabase workbooks that sync trades, checklists, and mentor notes.",
      "Routing guardrails that align algorithmic and discretionary flows.",
    ],
  },
];

const PRACTICE_LABS: CadenceModule[] = [
  {
    id: "journal-lab",
    title: "Journal lab",
    cadence: "After every session",
    description:
      "Transform raw fills into an annotated trade journal with automated insights and tags.",
    bullets: [
      "Import fills from MT5/Exness or record manual trades on the fly.",
      "Label mistakes and wins to feed the deliberate practice backlog.",
      "Generate a mentor-ready summary with lessons and next actions.",
    ],
  },
  {
    id: "scenario-replay",
    title: "Scenario replay studio",
    cadence: "Twice weekly",
    description:
      "Run guided rehearsals that pressure-test decision making before the market opens.",
    bullets: [
      "Multi-LLM prompts recreate volatility spikes and policy moves.",
      "Desk risk limits surface in real time so adjustments become muscle memory.",
      "Action logs export to the trade journal for accountability follow-ups.",
    ],
  },
  {
    id: "mentor-office-hours",
    title: "Mentor office hours",
    cadence: "Live cohort calls",
    description:
      "Drop into focused sessions where senior strategists review plays, automation, and mindset.",
    bullets: [
      "Desk leads annotate playbook updates directly in your workspace.",
      "Performance dashboards highlight drawdown recovery priorities.",
      "Signals, objectives, and support escalations stay in one threaded view.",
    ],
  },
];

interface ReviewCadence {
  id: string;
  title: string;
  summary: string;
  actions: string[];
}

const REVIEW_CADENCES: ReviewCadence[] = [
  {
    id: "daily-reset",
    title: "Daily reset",
    summary:
      "Close the trading day with a concise readout so the next session begins with clarity.",
    actions: [
      "Summarise PnL, risk breaches, and checklist misses in under five minutes.",
      "Tag new scenarios for rehearsal and assign follow-up owners.",
      "Update trade readiness score so mentors spot fatigue or overtrading early.",
    ],
  },
  {
    id: "weekly-sync",
    title: "Weekly mentor sync",
    summary:
      "Zoom out on performance trends and decide which learning track to emphasise next.",
    actions: [
      "Compare win rate vs. quality of setups logged in the journal.",
      "Review automation backlog and unblock integration tasks.",
      "Highlight standout trades to share with the wider desk community.",
    ],
  },
  {
    id: "monthly-audit",
    title: "Monthly audit",
    summary:
      "Reconcile account growth, compliance checks, and program milestones before scaling risk.",
    actions: [
      "Validate guardrails against treasury and counterparty requirements.",
      "Refresh mentorship objectives for the upcoming month.",
      "Publish a consolidated report for investors and leadership stakeholders.",
    ],
  },
];

interface ResourceLink {
  id: string;
  label: string;
  href: string;
  description: string;
}

const RESOURCE_LINKS: ResourceLink[] = [
  {
    id: "journal",
    label: "Launch the trade journal",
    href: "/tools/trade-journal",
    description:
      "Capture every trade with AI-generated highlights, risk callouts, and next steps ready to share.",
  },
  {
    id: "academy",
    label: "Open the academy track",
    href: "/blog/posts/school-of-pipsology",
    description:
      "Start with the School of Pipsology primer to align terminology before mentor sessions.",
  },
  {
    id: "mentorship",
    label: "Book a mentorship consult",
    href: "/support",
    description:
      "Talk directly with the desk to tailor learning cadences, automation scope, and onboarding.",
  },
];

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Column gap="8" maxWidth={64}>
      <Heading variant="display-strong-xs">{title}</Heading>
      <Text variant="body-default-m" onBackground="neutral-weak">
        {description}
      </Text>
    </Column>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <Column as="ul" gap="8">
      {items.map((item) => (
        <Row key={item} gap="8" vertical="center">
          <Icon name="check" onBackground="brand-medium" />
          <Text as="li" variant="body-default-m">
            {item}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

function WorkspaceHero() {
  return (
    <Column gap="16">
      <Row gap="12" vertical="center" wrap>
        <Heading variant="display-strong-xs">
          Trade execution meets mentorship
        </Heading>
        <Tag size="s" prefixIcon="sparkles">
          Desk beta
        </Tag>
      </Row>
      <Text variant="body-default-l" onBackground="neutral-weak">
        The Dynamic Trade &amp; Learn workspace connects live trading telemetry,
        deliberate practice drills, and mentor cadences so every operator
        improves with the same playbook.
      </Text>
      <Row gap="12" wrap>
        <Button href="/plans" variant="primary" data-border="rounded">
          Join the desk
        </Button>
        <Button
          href="/tools/trade-journal"
          variant="secondary"
          data-border="rounded"
        >
          Launch trade journal
        </Button>
      </Row>
    </Column>
  );
}

function ReadinessSection() {
  return (
    <Column gap="20" fillWidth>
      <SectionHeader
        title="Live trading readiness"
        description="Monitor capital, signal velocity, and currency bias before opening the next trade idea."
      />
      <div className="grid w-full gap-6 xl:grid-cols-3 md:grid-cols-2">
        <div className="h-full">
          <WalletCard />
        </div>
        <div className="h-full">
          <SignalsWidget />
        </div>
        <div className="h-full">
          <StrengthMeter />
        </div>
      </div>
      <div className={cn(WORKSPACE_MOBILE_RAIL_PADDING, "md:m-0")}>
        <div
          className={cn(
            WORKSPACE_MOBILE_RAIL_CONTAINER,
            "px-1 sm:grid sm:grid-cols-2 sm:gap-6 sm:px-0 lg:grid-cols-3",
          )}
        >
          {PROGRESS_METRICS.map((metric) => (
            <Card
              key={metric.id}
              className={cn(
                WORKSPACE_MOBILE_CARD,
                "flex h-full min-h-[180px] flex-col justify-between gap-3 border-border/60 bg-background/70 p-6 shadow-sm shadow-primary/5 backdrop-blur",
              )}
            >
              <span className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </span>
              <span className="text-2xl font-semibold text-primary">
                {metric.value}
              </span>
              <p className="text-sm text-muted-foreground">
                {metric.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </Column>
  );
}

function CadenceCard({
  title,
  description,
  cadence,
  bullets,
}: CadenceModule) {
  return (
    <Column
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      padding="l"
      gap="16"
    >
      <Row
        horizontal="between"
        vertical="center"
        s={{ direction: "column", align: "start" }}
        gap="12"
      >
        <Column gap="8">
          <Heading variant="heading-strong-m">{title}</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            {description}
          </Text>
        </Column>
        <Tag size="s" prefixIcon="timer">
          {cadence}
        </Tag>
      </Row>
      <Checklist items={bullets} />
    </Column>
  );
}

function CadenceSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: CadenceModule[];
}) {
  return (
    <Column gap="20" fillWidth>
      <SectionHeader title={title} description={description} />
      <div className={cn(WORKSPACE_MOBILE_RAIL_PADDING, "md:m-0")}>
        <div
          className={cn(
            WORKSPACE_MOBILE_RAIL_CONTAINER,
            "px-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-0",
          )}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(WORKSPACE_MOBILE_CARD, "sm:min-w-0")}
            >
              <CadenceCard {...item} />
            </div>
          ))}
        </div>
      </div>
    </Column>
  );
}

function ReviewCadenceStack() {
  return (
    <Column gap="16">
      {REVIEW_CADENCES.map((cadence, index) => (
        <Column key={cadence.id} gap="16">
          <Column gap="12">
            <Heading variant="heading-strong-s">{cadence.title}</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {cadence.summary}
            </Text>
            <Checklist items={cadence.actions} />
          </Column>
          {index < REVIEW_CADENCES.length - 1 && (
            <Line background="neutral-alpha-weak" />
          )}
        </Column>
      ))}
    </Column>
  );
}

function AccountabilitySection() {
  return (
    <Column gap="20">
      <SectionHeader
        title="Accountability cadence"
        description="Keep every trader aligned with shared objectives and transparent follow-ups."
      />
      <ReviewCadenceStack />
    </Column>
  );
}

function ResourceLinksSection() {
  return (
    <Column gap="20" fillWidth>
      <SectionHeader
        title="Launch the next action"
        description="Explore the surfaces that power the Dynamic Trade &amp; Learn experience."
      />
      <div className={cn(WORKSPACE_MOBILE_RAIL_PADDING, "md:m-0")}>
        <div
          className={cn(
            WORKSPACE_MOBILE_RAIL_CONTAINER,
            "px-1 sm:grid sm:grid-cols-2 sm:gap-6 sm:px-0 lg:grid-cols-3",
          )}
        >
          {RESOURCE_LINKS.map((resource) => (
            <Card
              key={resource.id}
              className={cn(
                WORKSPACE_MOBILE_CARD,
                "flex h-full flex-col justify-between gap-4 border-border/60 bg-background/70 p-6 shadow-sm shadow-primary/5 backdrop-blur",
              )}
            >
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{resource.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {resource.description}
                </p>
              </div>
              <Button
                href={resource.href}
                variant="secondary"
                data-border="rounded"
              >
                Explore
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </Column>
  );
}

export function DynamicTradeAndLearn() {
  return (
    <Column gap="32" fillWidth>
      <DeskSection
        anchor="hero"
        background="surface"
        border="neutral-alpha-medium"
        shadow="l"
        width="compact"
      >
        <WorkspaceHero />
      </DeskSection>
      <DeskSection
        anchor="readiness"
        background="surface"
        border="neutral-alpha-medium"
        shadow="s"
        width="wide"
      >
        <ReadinessSection />
      </DeskSection>
      <DeskSection
        anchor="learning-tracks"
        background="neutral-alpha-weak"
        border="neutral-alpha-medium"
        width="compact"
      >
        <CadenceSection
          title="Learning tracks"
          description="Progress through structured playbooks that layer risk discipline, execution mastery, and automation fluency."
          items={LEARNING_TRACKS}
        />
      </DeskSection>
      <DeskSection
        anchor="practice-labs"
        background="neutral-alpha-weak"
        border="neutral-alpha-medium"
        width="compact"
      >
        <CadenceSection
          title="Practice labs"
          description="Convert insights into repetition with labs that mix automation, guided rehearsal, and live mentor feedback."
          items={PRACTICE_LABS}
        />
      </DeskSection>
      <DeskSection
        anchor="accountability"
        background="surface"
        border="neutral-alpha-medium"
        shadow="s"
        width="compact"
      >
        <AccountabilitySection />
      </DeskSection>
      <DeskSection
        anchor="resources"
        background="surface"
        border="neutral-alpha-medium"
        width="wide"
      >
        <ResourceLinksSection />
      </DeskSection>
    </Column>
  );
}

export default DynamicTradeAndLearn;
