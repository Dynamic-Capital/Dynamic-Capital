import { callEdgeFunction } from "@/config/supabase";

const CONTENT_KEY = "desk_preview_cards" as const;

interface ContentBatchEntry {
  content_key?: string | null;
  content_value?: unknown;
}

interface ContentBatchResponse {
  contents?: ContentBatchEntry[] | null;
}

export interface DeskPreviewCard {
  title: string;
  subtitle: string;
  metricLabel: string;
  metricValue: string;
  description: string;
  gradient: string;
}

export interface DeskPreviewCardResult {
  cards: DeskPreviewCard[];
  isFallback: boolean;
}

export const DEFAULT_DESK_PREVIEW_CARDS: DeskPreviewCard[] = [
  {
    title: "Desk Signal Feed",
    subtitle: "Next catalyst in 1h 42m",
    metricLabel: "Playbook edge",
    metricValue: "+1.9%",
    description: "EUR/USD breakout · Risk 0.4% · Targets stacked",
    gradient:
      "linear-gradient(135deg, hsl(var(--dc-brand) / 0.95) 0%, hsl(var(--dc-secondary) / 0.85) 48%, hsl(var(--dc-brand-dark) / 0.85) 100%)",
  },
  {
    title: "Mentor Office Hours",
    subtitle: "Today · 18:30 GMT",
    metricLabel: "Seats left",
    metricValue: "5",
    description: "Submit your plan for live teardown and adjustments",
    gradient:
      "linear-gradient(135deg, hsl(var(--dc-secondary) / 0.9) 0%, hsl(var(--dc-accent) / 0.78) 60%, hsl(var(--dc-brand-dark) / 0.82) 100%)",
  },
  {
    title: "Risk Automation",
    subtitle: "Dynamic guardrails armed",
    metricLabel: "Max draw",
    metricValue: "0.6%",
    description: "Auto-pauses trigger if the threshold is breached",
    gradient:
      "linear-gradient(135deg, hsl(var(--dc-accent) / 0.88) 0%, hsl(var(--dc-secondary) / 0.8) 55%, hsl(var(--dc-brand-dark) / 0.85) 100%)",
  },
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractCardsPayload(
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

function asCardArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && "cards" in payload) {
    const candidate = (payload as { cards?: unknown }).cards;
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeCard(
  raw: unknown,
  fallback: DeskPreviewCard,
): DeskPreviewCard {
  if (!raw || typeof raw !== "object") {
    return { ...fallback };
  }

  const record = raw as Record<string, unknown>;

  const title =
    (isNonEmptyString(record.title)
      ? record.title
      : isNonEmptyString(record.name)
      ? record.name
      : null) ?? fallback.title;

  const subtitle =
    (isNonEmptyString(record.subtitle)
      ? record.subtitle
      : isNonEmptyString(record.subheading)
      ? record.subheading
      : null) ?? fallback.subtitle;

  const metricLabel =
    (isNonEmptyString(record.metricLabel)
      ? record.metricLabel
      : isNonEmptyString(record.metric_label)
      ? record.metric_label
      : null) ?? fallback.metricLabel;

  const metricValue =
    (isNonEmptyString(record.metricValue)
      ? record.metricValue
      : isNonEmptyString(record.metric_value)
      ? record.metric_value
      : null) ?? fallback.metricValue;

  const description =
    (isNonEmptyString(record.description)
      ? record.description
      : isNonEmptyString(record.body)
      ? record.body
      : null) ?? fallback.description;

  const gradient =
    (isNonEmptyString(record.gradient)
      ? record.gradient
      : isNonEmptyString(record.background)
      ? record.background
      : null) ?? fallback.gradient;

  return {
    title,
    subtitle,
    metricLabel,
    metricValue,
    description,
    gradient,
  };
}

function normalizeCards(payload: unknown): DeskPreviewCard[] {
  const rawCards = asCardArray(payload);
  if (rawCards.length === 0) {
    return [];
  }

  return rawCards.map((card, index) => {
    const fallback =
      DEFAULT_DESK_PREVIEW_CARDS[index % DEFAULT_DESK_PREVIEW_CARDS.length];
    return normalizeCard(card, fallback);
  });
}

export async function fetchDeskPreviewCards(
  options: { callEdge?: typeof callEdgeFunction } = {},
): Promise<DeskPreviewCardResult> {
  const { callEdge = callEdgeFunction } = options;

  const { data, error } = await callEdge<ContentBatchResponse>(
    "CONTENT_BATCH",
    {
      method: "POST",
      body: { keys: [CONTENT_KEY] },
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to load desk preview cards");
  }

  const cards = normalizeCards(extractCardsPayload(data ?? null));
  if (cards.length === 0) {
    return { cards: DEFAULT_DESK_PREVIEW_CARDS, isFallback: true };
  }

  return { cards, isFallback: false };
}
