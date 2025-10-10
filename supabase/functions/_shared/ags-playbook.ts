const SUPPORTED_LANGUAGES = ["en", "dv"] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export interface PlaybookContext {
  mission: string;
  cadence: string;
  risk_tolerance: number;
  automation_expectation: number;
  readiness_pressure: number;
  oversight_level: number;
  escalation_channels: string[];
  scenario_focus: string[];
  highlight_limit: number;
}

export interface PlaybookEntry {
  id: string;
  title: string;
  objective: string;
  stage: string;
  readiness: number;
  automation: number;
  risk: number;
  weight: number;
  tags: string[];
  owners?: string[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  scheduled_at: string;
}

export interface PlaybookPayload {
  language: SupportedLanguage;
  generatedAt: string;
  context: PlaybookContext;
  entries: PlaybookEntry[];
  highlights: string[];
}

const DEFAULT_CONTEXT: PlaybookContext = {
  mission: "Dynamic AGS multi-agent governance launch",
  cadence: "Weekly governance sync + daily ops stand-up",
  risk_tolerance: 0.45,
  automation_expectation: 0.6,
  readiness_pressure: 0.62,
  oversight_level: 0.7,
  escalation_channels: [
    "Owner escalation channel",
    "Operator incident line",
  ],
  scenario_focus: [
    "governance",
    "synchronization",
    "memory",
    "observability",
    "reliability",
  ],
  highlight_limit: 5,
};

const BASE_TIMESTAMP = Date.parse("2024-05-01T00:00:00.000Z");

const BASE_ENTRIES: Array<
  Omit<PlaybookEntry, "id" | "scheduled_at"> & {
    id?: string;
    scheduleOffsetDays?: number;
  }
> = [
  {
    title: "Establish AGS Governance Council",
    objective:
      "Assign owner, operator, and reviewer accountability with hardened escalation paths.",
    stage: "Governance",
    readiness: 0.58,
    automation: 0.35,
    risk: 0.42,
    weight: 1.2,
    tags: ["roles", "policy", "oversight"],
    owners: ["owner", "operator", "reviewer"],
    metadata: {
      section: "2.1 Roles",
      cadence: "Quarterly charter review",
      deliverables: [
        "Council charter",
        "Escalation rota",
        "Role registry",
      ],
    },
  },
  {
    title: "Codify Risk & Approval Policies",
    objective:
      "Translate tiered action classes into policy with critic thresholds and dual approvals.",
    stage: "Governance",
    readiness: 0.5,
    automation: 0.45,
    risk: 0.52,
    weight: 1.1,
    tags: ["policy", "risk", "approvals"],
    owners: ["owner", "operator"],
    dependencies: ["Establish AGS Governance Council"],
    metadata: {
      section: "2.2 Policies",
      risk_tiers: {
        T0: ["READ", "RESEARCH", "RETRIEVE"],
        T1: ["WRITE_DB", "SUMMARIZE", "DRAFT_REPLY"],
        T2: ["PUBLISH", "SOCIAL_POST"],
        T3: ["TRADE", "PAYMENT", "WITHDRAWAL"],
      },
      approvals: {
        T2: ["critic>=0.8", "operator_approval"],
        T3: [
          "critic>=0.9",
          "operator_approval",
          "owner_approval",
          "dry_run_required",
        ],
      },
    },
  },
  {
    title: "Provision Control Plane & Secrets",
    objective:
      "Deploy configuration service for policies, feature flags, and scoped secrets management.",
    stage: "Infrastructure",
    readiness: 0.48,
    automation: 0.52,
    risk: 0.46,
    weight: 1.0,
    tags: ["control-plane", "secrets", "supabase"],
    owners: ["operator", "backend"],
    dependencies: ["Codify Risk & Approval Policies"],
    metadata: {
      section: "1 Architecture / Control Plane",
      platform: "Supabase config + KV",
      controls: ["feature flags", "policy registry", "secret rotation"],
    },
  },
  {
    title: "Deploy Shared Memory Layer",
    objective:
      "Stand up Redis STM, Postgres MTM, and vector knowledge base with lifecycle policies.",
    stage: "Memory",
    readiness: 0.45,
    automation: 0.55,
    risk: 0.5,
    weight: 1.25,
    tags: ["memory", "redis", "vector"],
    owners: ["backend", "data"],
    dependencies: ["Provision Control Plane & Secrets"],
    metadata: {
      section: "3.3 Shared Memory",
      retention: {
        redis_ttl_hours: 48,
        postgres_retention_days: 90,
      },
      vector_store: "pgvector",
    },
  },
  {
    title: "Implement Event Bus Contracts",
    objective:
      "Define versioned event schemas and idempotency enforcement across orchestrator channels.",
    stage: "Synchronization",
    readiness: 0.44,
    automation: 0.58,
    risk: 0.54,
    weight: 1.2,
    tags: ["events", "schema", "idempotency"],
    owners: ["backend", "operator"],
    dependencies: ["Provision Control Plane & Secrets"],
    metadata: {
      section: "3.2 Message Passing",
      event_types: [
        "TASK_CREATED",
        "STEP_READY",
        "STEP_DONE",
        "NEED_APPROVAL",
        "PUBLISH_OK",
        "INCIDENT_RAISED",
      ],
      idempotency_key: "task_id:step:hash",
    },
  },
  {
    title: "Wire Task DAG Orchestrator",
    objective:
      "Implement DAG planner with risk-tagged steps, approvals, and archive flow integrations.",
    stage: "Orchestration",
    readiness: 0.42,
    automation: 0.6,
    risk: 0.56,
    weight: 1.3,
    tags: ["planner", "dag", "workflow"],
    owners: ["backend", "planner"],
    dependencies: [
      "Deploy Shared Memory Layer",
      "Implement Event Bus Contracts",
    ],
    metadata: {
      section: "4 Task Lifecycle",
      risk_tags: ["T0", "T1", "T2", "T3"],
      archive_outputs: true,
    },
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function normaliseLanguage(language?: string | null): SupportedLanguage {
  if (!language) return "en";
  const trimmed = language.trim().toLowerCase();
  if (trimmed.length === 0) return "en";
  if (SUPPORTED_LANGUAGES.includes(trimmed as SupportedLanguage)) {
    return trimmed as SupportedLanguage;
  }
  throw new Error(
    `Unsupported language '${language}'. Supported languages: ${
      SUPPORTED_LANGUAGES.join(", ")
    }`,
  );
}

function withSchedule(
  entries: typeof BASE_ENTRIES,
  baseContext: PlaybookContext,
): PlaybookEntry[] {
  return entries.map((entry, index) => {
    const scheduledAt = new Date(
      BASE_TIMESTAMP +
        (entry.scheduleOffsetDays ?? index * 3) * 24 * 60 * 60 * 1000,
    ).toISOString();

    const id = entry.id ?? slugify(entry.title);

    return {
      ...entry,
      id,
      scheduled_at: scheduledAt,
      metadata: {
        ...(entry.metadata ?? {}),
        cadence: entry.metadata?.cadence ?? baseContext.cadence,
      },
    } satisfies PlaybookEntry;
  });
}

function buildHighlights(entries: PlaybookEntry[], limit: number): string[] {
  return [...entries]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, Math.max(1, limit))
    .map((entry) => `${entry.title} – ${entry.stage}`);
}

export interface BuildPlaybookOptions {
  language?: string | null;
  contextOverrides?: Partial<PlaybookContext>;
  additionalEntries?: PlaybookEntry[];
}

export function buildDynamicAgsPlaybook(
  options: BuildPlaybookOptions = {},
): PlaybookPayload {
  const language = normaliseLanguage(options.language);
  const context: PlaybookContext = {
    ...DEFAULT_CONTEXT,
    ...(options.contextOverrides ?? {}),
  };

  const baseEntries = withSchedule(BASE_ENTRIES, context);
  const extraEntries = (options.additionalEntries ?? []).map((entry) => ({
    ...entry,
    scheduled_at: entry.scheduled_at ?? new Date().toISOString(),
  }));

  const entries = [...baseEntries, ...extraEntries];
  const highlights = buildHighlights(entries, context.highlight_limit);

  return {
    language,
    generatedAt: new Date().toISOString(),
    context,
    entries,
    highlights,
  } satisfies PlaybookPayload;
}

export function buildAgsSystemPrompt(payload: PlaybookPayload): string {
  const focusList = payload.context.scenario_focus
    .map((focus) => `• ${focus}`)
    .join("\n");

  const highlightList = payload.highlights
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");

  return [
    "You are Dynamic AGS, the governance strategist ensuring AI operations remain compliant and risk-aware.",
    `Mission: ${payload.context.mission}.`,
    `Cadence: ${payload.context.cadence}.`,
    "Focus areas:",
    focusList,
    "Priority initiatives:",
    highlightList,
    "Coordinate with Dynamic AI for telemetry insights and Dynamic AGI for execution readiness.",
    "Respond with concise governance guidance, escalation requirements, and policy implications for each request.",
  ].join("\n");
}
