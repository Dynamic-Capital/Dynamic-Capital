"use client";

import { useMemo, useState } from "react";

import { Column, Heading, Row, Text } from "@/components/dynamic-ui-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils";

const STATUS_STYLES: Record<string, string> = {
  Live: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Pilot: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  "In review": "border-amber-400/40 bg-amber-500/10 text-amber-200",
  Automating: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200",
  Planned: "border-slate-500/40 bg-slate-800/40 text-slate-200",
  "Needs attention": "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

const DEFAULT_STATUS_STYLE =
  "border-slate-600/50 bg-slate-800/40 text-slate-200";

type PersonaId = "trader" | "operations" | "compliance";

type PersonaMetric = {
  label: string;
  value: string;
  description: string;
};

type PersonaFlow = {
  stage: string;
  status: string;
  description: string;
  touchpoints: string[];
  owner: string;
};

type PersonaAutomation = {
  name: string;
  status: string;
  trigger: string;
  coverage: string;
  owner: string;
};

type PersonaDefinition = {
  id: PersonaId;
  label: string;
  tagline: string;
  description: string;
  metrics: PersonaMetric[];
  flows: PersonaFlow[];
  automations: PersonaAutomation[];
};

const PERSONA_DEFINITIONS: PersonaDefinition[] = [
  {
    id: "trader",
    label: "Trader launchpad",
    tagline:
      "Accelerate high-intent traders from Telegram handshake to funded account.",
    description:
      "Model the core trader journey, from identity sync and capital readiness checks to the mentor warmup that primes day-one performance.",
    metrics: [
      {
        label: "Activation speed",
        value: "2m 18s",
        description:
          "Average time from NFC passport scan to trading clearance.",
      },
      {
        label: "Deposit completion",
        value: "96%",
        description: "Verified traders completing the initial capital drop.",
      },
      {
        label: "Signal opt-in",
        value: "87%",
        description:
          "New accounts enabling desk signals within the first session.",
      },
    ],
    flows: [
      {
        stage: "Signal preflight",
        status: "Live",
        description:
          "Prefill KYC payloads using Telegram identity, CRM heuristics, and sanctions sweeps before the trader even opens the Mini App.",
        touchpoints: [
          "Telegram ID sync",
          "Risk heuristics",
          "Desk priority scoring",
        ],
        owner: "Acquisition pod",
      },
      {
        stage: "Mini App KYC",
        status: "Live",
        description:
          "Stream NFC passport capture, bank connection, and proof-of-address fallback so traders clear requirements without breaking flow.",
        touchpoints: [
          "Passport NFC",
          "Bank connection",
          "Utility bill OCR",
        ],
        owner: "Onboarding core",
      },
      {
        stage: "Capital activation",
        status: "Pilot",
        description:
          "Route cleared traders into mentor warmup, desk assignment, and deposit verification in one automation bundle.",
        touchpoints: [
          "Deposit handshake",
          "Mentor scheduling",
          "Desk cell assignment",
        ],
        owner: "Trader success",
      },
    ],
    automations: [
      {
        name: "Liquidity pre-commit",
        status: "Live",
        trigger: "After KYC approval",
        coverage:
          "Locks desk capacity, generates treasury memo, and notifies the routing engine to prepare guardrails.",
        owner: "Treasury ops",
      },
      {
        name: "Mentor warm intro",
        status: "Pilot",
        trigger: "2 minutes post deposit",
        coverage:
          "Auto-matches mentor timezone and language, sends session brief, and posts context into the mentor console.",
        owner: "Community desk",
      },
      {
        name: "Signal scaffolding",
        status: "In review",
        trigger: "After first trade",
        coverage:
          "Bundles curated signals, guardrails, and desk notes to keep the trader aligned with portfolio strategy.",
        owner: "Strategy lab",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations control",
    tagline:
      "Keep treasury, desk telemetry, and escalations flowing without manual chase.",
    description:
      "Design the runbooks Ops uses to triage deposits, reconcile ledgers, and resolve incidents with clear escalation paths.",
    metrics: [
      {
        label: "Automation coverage",
        value: "78%",
        description: "Ops workflows executed end-to-end without manual touch.",
      },
      {
        label: "Escalation SLA",
        value: "6m",
        description: "Median time to respond when deposit guardrails fire.",
      },
      {
        label: "Active pods",
        value: "4",
        description:
          "Operations pods running telemetry and reconciliation loops.",
      },
    ],
    flows: [
      {
        stage: "Queue triage",
        status: "Live",
        description:
          "Risk-tiered queues backed by Postgres lateral views and Slack nudges keep the right operator on every review.",
        touchpoints: [
          "Adaptive queue scoring",
          "Slack priority pings",
          "Desk shift handoff",
        ],
        owner: "Ops control",
      },
      {
        stage: "Reconciliation",
        status: "Live",
        description:
          "Ledger sync across bank rails, USDT flows, and instant settlements with exception snapshots for finance review.",
        touchpoints: [
          "Ledger diff watchers",
          "Bank webhook ingest",
          "USDT mempool monitors",
        ],
        owner: "Treasury ops",
      },
      {
        stage: "Incident loop",
        status: "In review",
        description:
          "Runbooks pair Inngest tasks with escalation scripts, so incidents escalate with full context and response timers.",
        touchpoints: [
          "Inngest branch plan",
          "Pager escalation",
          "War-room timeline",
        ],
        owner: "Reliability desk",
      },
    ],
    automations: [
      {
        name: "Vault reconciliation",
        status: "Live",
        trigger: "Every 5 minutes",
        coverage:
          "Cross-checks ledger balances against bank and chain snapshots, raising alerts when drift exceeds thresholds.",
        owner: "Finance automation",
      },
      {
        name: "Desk shift hand-off",
        status: "Automating",
        trigger: "Shift start",
        coverage:
          "Compiles context packs, anomaly summaries, and open tasks before each operator signs in.",
        owner: "Ops control",
      },
      {
        name: "Anomaly digest",
        status: "Pilot",
        trigger: "After 3+ anomalies",
        coverage:
          "Summarizes incident clusters and routes compliance-ready notes into the review queue.",
        owner: "Risk desk",
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance assurance",
    tagline:
      "Prove every workflow with audit-ready evidence and regulator packets.",
    description:
      "Blueprint how sanction sweeps, evidence lockers, and regulator briefings stay synchronized with trading velocity.",
    metrics: [
      {
        label: "Case closure",
        value: "88%",
        description: "Compliance reviews closed on first pass each month.",
      },
      {
        label: "Evidence freshness",
        value: "12h",
        description:
          "Average time to archive sanction screenings with receipts.",
      },
      {
        label: "Policy coverage",
        value: "42",
        description: "Controls mapped to internal risk playbooks and audits.",
      },
    ],
    flows: [
      {
        stage: "Continuous monitoring",
        status: "Live",
        description:
          "Stream KYT heuristics, sanction sweeps, and adverse media checks with snapshots for auditors.",
        touchpoints: [
          "KYT heuristics",
          "Adverse media queue",
          "PEP mapping",
        ],
        owner: "Compliance automation",
      },
      {
        stage: "Case audit",
        status: "Pilot",
        description:
          "Collect supporting documents, approvals, and retention markers with immutable references.",
        touchpoints: [
          "Evidence locker",
          "Approval routing",
          "Retention tags",
        ],
        owner: "RegOps",
      },
      {
        stage: "Regulator packets",
        status: "Planned",
        description:
          "Generate quarterly regulator packets with narratives, metrics, and outstanding remediation steps.",
        touchpoints: [
          "Narrative generator",
          "Dataset exports",
          "Sign-off ledger",
        ],
        owner: "Legal",
      },
    ],
    automations: [
      {
        name: "Sanction sweep",
        status: "Live",
        trigger: "Per deposit + nightly full sweep",
        coverage:
          "Cross-checks OFAC, EU, and MAS lists with versioned snapshots and anomaly alerts.",
        owner: "Compliance automation",
      },
      {
        name: "Evidence locker sync",
        status: "Pilot",
        trigger: "Case status change",
        coverage:
          "Pins documents into WORM storage, captures tamper receipts, and updates retention clocks.",
        owner: "Records management",
      },
      {
        name: "Regulator briefing draft",
        status: "Planned",
        trigger: "Quarterly cycle",
        coverage:
          "Drafts summary packets with metrics, outstanding cases, and next remediation milestones.",
        owner: "RegOps",
      },
    ],
  },
];

const PERSONA_COLUMNS: { id: PersonaId; label: string }[] = [
  { id: "trader", label: "Trader" },
  { id: "operations", label: "Operations" },
  { id: "compliance", label: "Compliance" },
];

type ModuleCoverage = Record<
  PersonaId,
  {
    status: string;
    description: string;
  }
>;

type ModuleMatrixEntry = {
  module: string;
  owner: string;
  coverage: ModuleCoverage;
};

const MODULE_MATRIX: ModuleMatrixEntry[] = [
  {
    module: "Identity & risk scoring",
    owner: "Onboarding core",
    coverage: {
      trader: {
        status: "Live",
        description:
          "Instant ID handshake with Telegram prefill and risk heuristics.",
      },
      operations: {
        status: "Live",
        description: "Ops queue with escalation heuristics and SLA timers.",
      },
      compliance: {
        status: "Live",
        description:
          "Versioned sanction snapshots and case linking for audits.",
      },
    },
  },
  {
    module: "Payments & treasury",
    owner: "Treasury ops",
    coverage: {
      trader: {
        status: "Live",
        description:
          "Bank and on-chain deposit orchestration with instant confirmation.",
      },
      operations: {
        status: "Automating",
        description:
          "Ledger diff watchers, alerts, and Slack digests for drift.",
      },
      compliance: {
        status: "Pilot",
        description:
          "Proof-of-funds binder with audit exports and retention markers.",
      },
    },
  },
  {
    module: "Mentor & community",
    owner: "Community desk",
    coverage: {
      trader: {
        status: "Pilot",
        description:
          "Auto-match mentors, warmup scheduling, and session briefs.",
      },
      operations: {
        status: "Planned",
        description:
          "Shift load forecasting hooks and staffing recommendations.",
      },
      compliance: {
        status: "Planned",
        description:
          "Session archiving with retention tags and consent tracking.",
      },
    },
  },
  {
    module: "Observability & analytics",
    owner: "Strategy lab",
    coverage: {
      trader: {
        status: "Live",
        description: "Signal scaffolding, performance tiles, and alert nudges.",
      },
      operations: {
        status: "Live",
        description: "Desk telemetry, anomaly scoring, and runbook health.",
      },
      compliance: {
        status: "In review",
        description:
          "Regulator drill-down views with evidence links and notes.",
      },
    },
  },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE,
      )}
    >
      {status}
    </span>
  );
}

function PersonaView({ persona }: { persona: PersonaDefinition }) {
  return (
    <Column gap="24" fillWidth>
      <Column gap="8" maxWidth={88}>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {persona.description}
        </Text>
      </Column>
      <Row gap="16" wrap fillWidth>
        {persona.metrics.map((metric) => (
          <Column
            key={`${persona.id}-${metric.label}`}
            gap="8"
            padding="16"
            radius="m"
            border="neutral-alpha-weak"
            background="surface"
            className="min-w-[200px] flex-1"
          >
            <Text variant="label-default-s" onBackground="neutral-medium">
              {metric.label}
            </Text>
            <Heading variant="display-strong-xs">{metric.value}</Heading>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {metric.description}
            </Text>
          </Column>
        ))}
      </Row>
      <Row gap="16" wrap fillWidth>
        <Column flex={1} minWidth={36}>
          <Card className="h-full border-border/60 bg-background/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Journey blueprint
              </CardTitle>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Track the checkpoints, owners, and touchpoints that move this
                persona from intent to full activation.
              </Text>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {persona.flows.map((flow) => (
                <div
                  key={`${persona.id}-${flow.stage}`}
                  className="rounded-lg border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-medium"
                    >
                      {flow.stage}
                    </Text>
                    <StatusBadge status={flow.status} />
                  </div>
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-weak"
                    className="mt-2"
                  >
                    {flow.description}
                  </Text>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {flow.touchpoints.map((touchpoint) => (
                      <span
                        key={`${flow.stage}-${touchpoint}`}
                        className="rounded-full border border-border/40 bg-background/40 px-3 py-1 text-xs text-muted-foreground"
                      >
                        {touchpoint}
                      </span>
                    ))}
                  </div>
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    className="mt-3"
                  >
                    Owner: {flow.owner}
                  </Text>
                </div>
              ))}
            </CardContent>
          </Card>
        </Column>
        <Column flex={1} minWidth={36}>
          <Card className="h-full border-border/60 bg-background/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Automation guardrails
              </CardTitle>
              <Text variant="body-default-s" onBackground="neutral-weak">
                See which automations are live, piloting, or queued so launch
                teams know where to invest next.
              </Text>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {persona.automations.map((automation) => (
                <div
                  key={`${persona.id}-${automation.name}`}
                  className="rounded-lg border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-medium"
                    >
                      {automation.name}
                    </Text>
                    <StatusBadge status={automation.status} />
                  </div>
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    className="mt-2"
                  >
                    Trigger: {automation.trigger}
                  </Text>
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-weak"
                    className="mt-2"
                  >
                    {automation.coverage}
                  </Text>
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    className="mt-3"
                  >
                    Owner: {automation.owner}
                  </Text>
                </div>
              ))}
            </CardContent>
          </Card>
        </Column>
      </Row>
    </Column>
  );
}

function ModuleMatrix() {
  const readinessSummary = useMemo(() => {
    return PERSONA_COLUMNS.map(({ id }) => {
      const liveCount = MODULE_MATRIX.filter(
        (entry) => entry.coverage[id].status === "Live",
      ).length;
      return { persona: id, liveCount };
    });
  }, []);

  return (
    <Card className="border-border/60 bg-background/70">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">
          Module orchestration matrix
        </CardTitle>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Map readiness across trader, operations, and compliance personas to
          coordinate the next launch increment.
        </Text>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <Row gap="12" wrap>
          {readinessSummary.map((summary) => (
            <Column
              key={`summary-${summary.persona}`}
              gap="4"
              padding="12"
              radius="s"
              border="neutral-alpha-weak"
              background="surface"
              className="min-w-[160px]"
            >
              <Text variant="label-default-s" onBackground="neutral-medium">
                {summary.persona.charAt(0).toUpperCase() +
                  summary.persona.slice(1)}
              </Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {summary.liveCount} modules live
              </Text>
            </Column>
          ))}
        </Row>
        <div className="overflow-x-auto">
          <div className="min-w-[320px] space-y-3">
            <div className="grid gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid-cols-[1.6fr,repeat(3,minmax(0,1fr))]">
              <span className="hidden md:block">Module</span>
              {PERSONA_COLUMNS.map((column) => (
                <span key={`header-${column.id}`}>{column.label}</span>
              ))}
            </div>
            {MODULE_MATRIX.map((entry) => (
              <div
                key={entry.module}
                className="grid gap-3 md:grid-cols-[1.6fr,repeat(3,minmax(0,1fr))]"
              >
                <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                  <Text
                    variant="label-default-s"
                    onBackground="neutral-medium"
                  >
                    {entry.module}
                  </Text>
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    className="mt-2"
                  >
                    Owner: {entry.owner}
                  </Text>
                </div>
                {PERSONA_COLUMNS.map((column) => {
                  const coverage = entry.coverage[column.id];
                  return (
                    <div
                      key={`${entry.module}-${column.id}`}
                      className="rounded-lg border border-border/60 bg-background/50 p-4"
                    >
                      <Text
                        variant="label-default-xs"
                        onBackground="neutral-medium"
                        className="mb-2 md:hidden"
                      >
                        {column.label}
                      </Text>
                      <StatusBadge status={coverage.status} />
                      <Text
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                        className="mt-2 leading-relaxed"
                      >
                        {coverage.description}
                      </Text>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DynamicAppWorkbench() {
  const [activePersona, setActivePersona] = useState<PersonaId>("trader");

  return (
    <Column gap="32" fillWidth>
      <Card className="border-border/60 bg-background/70 shadow-lg shadow-brand/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-foreground">
            Persona launch control
          </CardTitle>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Switch between the core personas to assemble launch journeys,
            automations, and ownership guardrails.
          </Text>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs
            value={activePersona}
            onValueChange={(value) => setActivePersona(value as PersonaId)}
            className="w-full"
          >
            <TabsList className="grid gap-2 md:grid-cols-3" animateIndicator>
              {PERSONA_DEFINITIONS.map((persona) => (
                <TabsTrigger
                  key={persona.id}
                  value={persona.id}
                  className="flex h-auto flex-col items-start gap-1 rounded-md border border-transparent bg-background/60 px-3 py-3 text-left text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-border data-[state=active]:bg-background/80 data-[state=active]:text-foreground"
                >
                  <span className="text-sm font-semibold leading-tight">
                    {persona.label}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {persona.tagline}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {PERSONA_DEFINITIONS.map((persona) => (
              <TabsContent key={persona.id} value={persona.id} className="mt-6">
                <PersonaView persona={persona} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <ModuleMatrix />
    </Column>
  );
}

export default DynamicAppWorkbench;
