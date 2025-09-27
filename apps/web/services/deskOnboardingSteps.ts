import { callEdgeFunction } from "@/config/supabase";

const CONTENT_KEY = "desk_onboarding_steps" as const;

interface ContentBatchEntry {
  content_key?: string | null;
  content_value?: unknown;
}

interface ContentBatchResponse {
  contents?: ContentBatchEntry[] | null;
}

export interface DeskOnboardingStep {
  id: string;
  label: string;
  icon: string;
  summary: string;
  highlights: string[];
  actionLabel: string;
  actionHref: string;
}

export interface DeskOnboardingStepResult {
  steps: DeskOnboardingStep[];
  isFallback: boolean;
}

const TELEGRAM_LINK = "https://t.me/DynamicCapital_Support";

export const DEFAULT_DESK_ONBOARDING_STEPS: DeskOnboardingStep[] = [
  {
    id: "orientation",
    label: "Orientation sprint",
    icon: "sparkles",
    summary:
      "Five bite-sized prompts help you define a goal, funding level, and time commitment in under ten minutes.",
    highlights: [
      "Tour the workspace and translate jargon into plain language",
      "Pin your first checklist so you always know the next move",
      "Bookmark the dashboard that tracks progress in real time",
    ],
    actionLabel: "Open guided workspace",
    actionHref: "/",
  },
  {
    id: "practice",
    label: "Practice in the simulator",
    icon: "calendar",
    summary:
      "Lock in a weekly drill using the desk calendar and rehearse the strategy on live markets without risking capital.",
    highlights: [
      "Follow a mentor-led warm-up before every session",
      "Journal practice trades with one-click templates",
      "Collect instant feedback to celebrate small wins early",
    ],
    actionLabel: "Schedule a drill",
    actionHref: "/plans",
  },
  {
    id: "feedback",
    label: "Get mentor feedback",
    icon: "repeat",
    summary:
      "Share your trading plan for a desk-side review and get a personal redirect toward VIP coaching or group labs.",
    highlights: [
      "Upload your plan for a recorded walkthrough",
      "Collect community playbooks matched to your goals",
      "Decide whether to scale solo or join a live lab",
    ],
    actionLabel: "Message the mentors",
    actionHref: TELEGRAM_LINK,
  },
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => isNonEmptyString(entry))
    .map((entry) => entry.trim());
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractStepsPayload(
  response: ContentBatchResponse | null | undefined,
): unknown {
  if (!response || !Array.isArray(response.contents)) {
    return null;
  }

  const entry = response.contents.find((item) =>
    item?.content_key === CONTENT_KEY
  );
  if (!entry) {
    return null;
  }

  const rawValue = entry.content_value;
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }
    return safeParseJson(trimmed);
  }

  return rawValue ?? null;
}

function asStepsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && "steps" in payload) {
    const candidate = (payload as { steps?: unknown }).steps;
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeStep(
  raw: unknown,
  fallback: DeskOnboardingStep,
): DeskOnboardingStep {
  if (!raw || typeof raw !== "object") {
    return { ...fallback };
  }

  const record = raw as Record<string, unknown>;

  const idSource =
    (isNonEmptyString(record.id)
      ? record.id
      : isNonEmptyString(record.slug)
      ? record.slug
      : null) ?? fallback.id;

  const label =
    (isNonEmptyString(record.label)
      ? record.label
      : isNonEmptyString(record.title)
      ? record.title
      : null) ?? fallback.label;

  const icon =
    (isNonEmptyString(record.icon)
      ? record.icon
      : isNonEmptyString(record.iconName)
      ? record.iconName
      : null) ?? fallback.icon;

  const summary =
    (isNonEmptyString(record.summary)
      ? record.summary
      : isNonEmptyString(record.description)
      ? record.description
      : null) ?? fallback.summary;

  const highlights = (() => {
    const candidate = "highlights" in record
      ? asStringArray(record.highlights)
      : "bullets" in record
      ? asStringArray(record.bullets)
      : [];

    if (candidate.length > 0) {
      return candidate;
    }

    return [...fallback.highlights];
  })();

  const action = (() => {
    if (record.action && typeof record.action === "object") {
      return record.action as Record<string, unknown>;
    }

    if (record.cta && typeof record.cta === "object") {
      return record.cta as Record<string, unknown>;
    }

    return {} as Record<string, unknown>;
  })();

  const actionLabel =
    (isNonEmptyString(record.actionLabel)
      ? record.actionLabel
      : isNonEmptyString(record.action_label)
      ? record.action_label
      : isNonEmptyString(action.label)
      ? action.label
      : isNonEmptyString(action.title)
      ? action.title
      : null) ?? fallback.actionLabel;

  const actionHref =
    (isNonEmptyString(record.actionHref)
      ? record.actionHref
      : isNonEmptyString(record.action_href)
      ? record.action_href
      : isNonEmptyString(action.href)
      ? action.href
      : isNonEmptyString(action.url)
      ? action.url
      : null) ?? fallback.actionHref;

  return {
    id: idSource,
    label,
    icon,
    summary,
    highlights,
    actionLabel,
    actionHref,
  };
}

function normalizeSteps(payload: unknown): DeskOnboardingStep[] {
  const rawSteps = asStepsArray(payload);
  if (rawSteps.length === 0) {
    return [];
  }

  return rawSteps.map((step, index) => {
    const fallback = DEFAULT_DESK_ONBOARDING_STEPS[
      index % DEFAULT_DESK_ONBOARDING_STEPS.length
    ];
    return normalizeStep(step, fallback);
  });
}

export async function fetchDeskOnboardingSteps(
  options: { callEdge?: typeof callEdgeFunction } = {},
): Promise<DeskOnboardingStepResult> {
  const { callEdge = callEdgeFunction } = options;

  const { data, error } = await callEdge<ContentBatchResponse>(
    "CONTENT_BATCH",
    {
      method: "POST",
      body: { keys: [CONTENT_KEY] },
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to load desk onboarding steps");
  }

  const steps = normalizeSteps(extractStepsPayload(data ?? null));
  if (steps.length === 0) {
    return { steps: DEFAULT_DESK_ONBOARDING_STEPS, isFallback: true };
  }

  return { steps, isFallback: false };
}
