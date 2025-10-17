import type { CSSProperties } from "react";

import type { MiniAppThemeOption } from "@shared/miniapp/theme-loader";

import { isSupportedPlan, type Plan } from "@/lib/ton-miniapp-helper";
import type { LiveMetric, LiveTimelineEntry } from "@/data/live-intel";

export type SectionId =
  | "overview"
  | "plans"
  | "minting"
  | "intel"
  | "activity"
  | "appearance"
  | "support";

export type SnapshotAdjustment = {
  key: string;
  value: number;
};

export type NormalizedPlanSnapshot = {
  computedAt: string | null;
  basePrice: number | null;
  dynamicPrice: number | null;
  displayPrice: number | null;
  tonAmount: number | null;
  dctAmount: number | null;
  tonRate: number | null;
  deltaPercent: number | null;
  adjustments: SnapshotAdjustment[];
};

export type PlanOption = {
  id: Plan;
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
  meta: {
    currency: string;
    amount: number | null;
    tonAmount: number | null;
    dctAmount: number | null;
    updatedAt: string | null;
    snapshot: NormalizedPlanSnapshot | null;
    snapshotSignature: string | null;
  };
};

export type RawPlan = {
  id?: string | null;
  name?: string | null;
  price?: number | string | null;
  base_price?: number | string | null;
  dynamic_price_usdt?: number | string | null;
  currency?: string | null;
  duration_months?: number | string | null;
  is_lifetime?: boolean | null;
  features?: unknown;
  last_priced_at?: string | null;
  ton_amount?: number | string | null;
  dct_amount?: number | string | null;
  performance_snapshot?: Record<string, unknown> | null;
};

export type PlanVisual = {
  accent: string;
  accentStrong: string;
  soft: string;
  glow: string;
  sheen: string;
  surface: string;
  shadow: string;
  tagline: string;
};

export type PlanSyncStatus = {
  isLoading: boolean;
  isRealtimeSyncing: boolean;
  updatedAt?: string;
  error?: string | null;
};

export type MintingPlanState =
  | { status: "idle"; progress: 0 }
  | { status: "starting"; progress: number }
  | { status: "success"; progress: 100; startedAt?: string }
  | { status: "error"; progress: number; error: string };

export type ThemeVisual = {
  background: string;
  accent: string;
  text: string;
};

export function resolveThemeVisual(theme: MiniAppThemeOption): ThemeVisual {
  const background =
    theme.cssVariables["--tg-bg"] ??
    theme.cssVariables["--surface"] ??
    "#0b1120";
  const accent =
    theme.cssVariables["--tg-accent"] ??
    theme.cssVariables["--accent"] ??
    "#38bdf8";
  const text =
    theme.cssVariables["--tg-text"] ??
    theme.cssVariables["--text-primary"] ??
    "#f8fafc";

  return { background, accent, text };
}

export function resolveThemeSwatches(theme: MiniAppThemeOption): string[] {
  const visual = resolveThemeVisual(theme);
  return [visual.background, visual.accent, visual.text];
}

export const SECTION_IDS: SectionId[] = [
  "overview",
  "plans",
  "minting",
  "intel",
  "activity",
  "appearance",
  "support",
];

export const FALLBACK_PLAN_OPTIONS: PlanOption[] = [
  {
    id: "vip_bronze",
    name: "VIP Bronze",
    price: "Loading price…",
    cadence: "3 month horizon",
    description:
      "Entry tier that mirrors the desk's base auto-invest strategy.",
    highlights: [
      "Desk monitored entries",
      "Weekly strategy calls",
      "Capital preservation guardrails",
    ],
    meta: {
      currency: "USD",
      amount: null,
      tonAmount: null,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
      snapshotSignature: null,
    },
  },
  {
    id: "vip_silver",
    name: "VIP Silver",
    price: "Loading price…",
    cadence: "6 month horizon",
    description:
      "Expanded allocation with leverage-managed exposure and mid-cycle rotations.",
    highlights: [
      "Dual momentum + carry blend",
      "Priority support window",
      "Quarterly performance briefing",
    ],
    meta: {
      currency: "USD",
      amount: null,
      tonAmount: null,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
      snapshotSignature: null,
    },
  },
  {
    id: "vip_gold",
    name: "VIP Gold",
    price: "Loading price…",
    cadence: "12 month horizon",
    description:
      "Full desk collaboration with access to structured products and vault strategies.",
    highlights: [
      "Structured product desk",
      "Liquidity provisioning slots",
      "Desk escalation on demand",
    ],
    meta: {
      currency: "USD",
      amount: null,
      tonAmount: null,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
      snapshotSignature: null,
    },
  },
  {
    id: "mentorship",
    name: "Mentorship Circle",
    price: "Loading price…",
    cadence: "12 month horizon",
    description:
      "One-on-one mentorship with the desk's senior PMs and quarterly onsite reviews.",
    highlights: [
      "Dedicated mentor queue",
      "Quarterly onsite review",
      "Capital introduction pathway",
    ],
    meta: {
      currency: "USD",
      amount: null,
      tonAmount: null,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
      snapshotSignature: null,
    },
  },
];

export const FALLBACK_PLAN_LOOKUP: Record<Plan, PlanOption> = Object.fromEntries(
  FALLBACK_PLAN_OPTIONS.map((option) => [option.id, option]),
) as Record<Plan, PlanOption>;

export const PLAN_VISUALS: Record<Plan | "default", PlanVisual> = {
  default: {
    accent: "#61d1ff",
    accentStrong: "#3aa5ff",
    soft: "rgba(97, 209, 255, 0.18)",
    glow: "rgba(97, 209, 255, 0.35)",
    sheen: "rgba(58, 165, 255, 0.28)",
    surface: "rgba(18, 33, 71, 0.85)",
    shadow: "rgba(15, 23, 42, 0.35)",
    tagline: "Desk-aligned signal tier",
  },
  vip_bronze: {
    accent: "#f59e0b",
    accentStrong: "#d97706",
    soft: "rgba(245, 158, 11, 0.18)",
    glow: "rgba(245, 158, 11, 0.38)",
    sheen: "rgba(120, 53, 15, 0.7)",
    surface: "rgba(24, 16, 8, 0.78)",
    shadow: "rgba(245, 158, 11, 0.32)",
    tagline: "Momentum-aligned entries from the desk core",
  },
  vip_silver: {
    accent: "#94a3b8",
    accentStrong: "#64748b",
    soft: "rgba(148, 163, 184, 0.2)",
    glow: "rgba(148, 163, 184, 0.35)",
    sheen: "rgba(30, 41, 59, 0.68)",
    surface: "rgba(15, 23, 42, 0.78)",
    shadow: "rgba(148, 163, 184, 0.28)",
    tagline: "Leverage-managed mid-cycle rotations",
  },
  vip_gold: {
    accent: "#facc15",
    accentStrong: "#eab308",
    soft: "rgba(250, 204, 21, 0.2)",
    glow: "rgba(250, 204, 21, 0.38)",
    sheen: "rgba(113, 63, 18, 0.7)",
    surface: "rgba(32, 24, 8, 0.82)",
    shadow: "rgba(250, 204, 21, 0.38)",
    tagline: "Structured products and vault orchestration",
  },
  mentorship: {
    accent: "#c084fc",
    accentStrong: "#a855f7",
    soft: "rgba(192, 132, 252, 0.2)",
    glow: "rgba(192, 132, 252, 0.4)",
    sheen: "rgba(76, 29, 149, 0.68)",
    surface: "rgba(32, 12, 72, 0.82)",
    shadow: "rgba(192, 132, 252, 0.36)",
    tagline: "Direct mentorship with senior PM alignment",
  },
};

export function getPlanVisual(plan?: Plan | null): PlanVisual {
  if (!plan) {
    return PLAN_VISUALS.default;
  }
  return PLAN_VISUALS[plan] ?? PLAN_VISUALS.default;
}

export function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalisePlanSnapshot(
  raw: unknown,
): NormalizedPlanSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const tonRateSource = record.tonRate ?? record.ton_rate;

  let tonRate: number | null = null;
  if (typeof tonRateSource === "number" || typeof tonRateSource === "string") {
    tonRate = coerceNumber(tonRateSource) ?? null;
  } else if (tonRateSource && typeof tonRateSource === "object") {
    tonRate = coerceNumber((tonRateSource as Record<string, unknown>).rate) ?? null;
  }

  const adjustments = record.adjustments &&
      typeof record.adjustments === "object" &&
      !Array.isArray(record.adjustments)
    ? Object.entries(record.adjustments as Record<string, unknown>)
        .map(([key, value]) => ({ key, value: coerceNumber(value) }))
        .filter((item): item is SnapshotAdjustment => typeof item.value === "number")
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    : [];

  const computedAtCandidate = record.computed_at ?? record.computedAt;
  const computedAt =
    typeof computedAtCandidate === "string" && computedAtCandidate.trim().length > 0
      ? computedAtCandidate
      : null;

  return {
    computedAt,
    basePrice: coerceNumber(record.base_price),
    dynamicPrice: coerceNumber(record.dynamic_price),
    displayPrice: coerceNumber(record.display_price),
    tonAmount: coerceNumber(record.ton_amount),
    dctAmount: coerceNumber(record.dct_amount),
    tonRate,
    deltaPercent: coerceNumber(record.delta_pct),
    adjustments,
  };
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrencyAmount(
  currency: string,
  amount: number,
  maximumFractionDigits: number,
): string {
  const key = `${currency}-${maximumFractionDigits}`;
  let formatter = currencyFormatterCache.get(key);

  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits,
      });
      currencyFormatterCache.set(key, formatter);
    } catch (error) {
      console.debug(
        "[miniapp] Falling back to basic currency formatting",
        currency,
        error,
      );
    }
  }

  if (formatter) {
    return formatter.format(amount);
  }

  const fixedDigits =
    maximumFractionDigits > 0
      ? amount.toFixed(Math.min(4, maximumFractionDigits))
      : Math.round(amount).toString();
  return `${fixedDigits} ${currency}`;
}

export function formatPlanLabel(
  currency: string,
  amount: number,
  isLifetime: boolean,
  durationMonths: number,
): string {
  const formatted = formatCurrencyAmount(
    currency,
    amount,
    amount % 1 === 0 ? 0 : 2,
  );
  if (isLifetime) {
    return `${formatted} lifetime`;
  }
  if (durationMonths <= 1) {
    return `${formatted} / month`;
  }
  if (durationMonths >= 12 && durationMonths % 12 === 0) {
    const years = durationMonths / 12;
    return `${formatted} / ${years} yr${years > 1 ? "s" : ""}`;
  }
  return `${formatted} / ${durationMonths} mo`;
}

export function serialiseSnapshot(
  snapshot: Record<string, unknown> | null,
): string | null {
  if (!snapshot) {
    return null;
  }

  try {
    return JSON.stringify(snapshot);
  } catch (error) {
    console.debug("[miniapp] Unable to serialise plan snapshot", error);
    return null;
  }
}

const PLAN_SNAPSHOT_CACHE_LIMIT = 32;
const planSnapshotCache = new Map<string, NormalizedPlanSnapshot | null>();

export function resolvePlanSnapshot(
  snapshot: Record<string, unknown> | null,
  signature: string | null,
): NormalizedPlanSnapshot | null {
  if (!snapshot) {
    return null;
  }

  if (signature && planSnapshotCache.has(signature)) {
    return planSnapshotCache.get(signature) ?? null;
  }

  const normalized = normalisePlanSnapshot(snapshot);

  if (signature) {
    if (!planSnapshotCache.has(signature) && planSnapshotCache.size >= PLAN_SNAPSHOT_CACHE_LIMIT) {
      const oldestKey = planSnapshotCache.keys().next().value;
      if (typeof oldestKey === "string") {
        planSnapshotCache.delete(oldestKey);
      }
    }
    planSnapshotCache.set(signature, normalized);
  }

  return normalized;
}

export function normalisePlanOptions(plans: RawPlan[]): PlanOption[] {
  const nextOptions: PlanOption[] = [];

  for (const raw of plans) {
    if (!raw) {
      continue;
    }

    const planId = typeof raw.id === "string" && isSupportedPlan(raw.id)
      ? raw.id
      : null;
    if (!planId) {
      continue;
    }

    const fallback = FALLBACK_PLAN_LOOKUP[planId];
    const name = typeof raw.name === "string" && raw.name.trim().length > 0
      ? raw.name
      : fallback.name;
    const currency =
      typeof raw.currency === "string" && raw.currency.trim().length > 0
        ? raw.currency.toUpperCase()
        : fallback.meta.currency ?? "USD";
    const amount =
      coerceNumber(raw.price) ??
      coerceNumber(raw.base_price) ??
      coerceNumber(raw.dynamic_price_usdt);
    const isLifetime = raw.is_lifetime === true;
    const duration = coerceNumber(raw.duration_months) ?? 0;
    const priceLabel = amount !== null
      ? formatPlanLabel(currency, amount, isLifetime, duration)
      : fallback.price;
    const highlights = Array.isArray(raw.features)
      ? raw.features.filter((feature): feature is string =>
          typeof feature === "string" && feature.trim().length > 0,
        )
      : fallback.highlights;

    const snapshot = raw.performance_snapshot ?? null;
    const snapshotSignature = serialiseSnapshot(snapshot);
    const normalizedSnapshot = resolvePlanSnapshot(snapshot, snapshotSignature);
    const tonAmount =
      coerceNumber(raw.ton_amount) ??
      normalizedSnapshot?.tonAmount ??
      fallback.meta.tonAmount ??
      null;
    const dctAmount =
      coerceNumber(raw.dct_amount) ??
      normalizedSnapshot?.dctAmount ??
      null;
    const computedAt = normalizedSnapshot?.computedAt ?? null;
    const cadence = isLifetime
      ? "Lifetime access"
      : duration >= 12 && duration % 12 === 0
      ? `${duration / 12} year${duration / 12 > 1 ? "s" : ""} runway`
      : duration > 1
      ? `${duration} month${duration > 1 ? "s" : ""} runway`
      : fallback.cadence;

    nextOptions.push({
      id: planId,
      name,
      price: priceLabel,
      cadence,
      description: fallback.description,
      highlights: highlights.length > 0 ? highlights : fallback.highlights,
      meta: {
        currency,
        amount,
        tonAmount,
        dctAmount,
        updatedAt: raw.last_priced_at ?? computedAt ?? fallback.meta.updatedAt,
        snapshot: normalizedSnapshot,
        snapshotSignature,
      },
    });
  }

  return nextOptions.length > 0 ? nextOptions : [...FALLBACK_PLAN_OPTIONS];
}

export function formatPercent(
  value: number | null,
  fractionDigits = 2,
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${abs.toFixed(fractionDigits)}%`;
}

export function formatAdjustmentLabel(key: string): string {
  if (!key) {
    return "Adjustment";
  }
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function areNormalizedSnapshotsEqual(
  a: NormalizedPlanSnapshot | null,
  b: NormalizedPlanSnapshot | null,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return !a && !b;
  }

  if (
    a.computedAt !== b.computedAt ||
    a.basePrice !== b.basePrice ||
    a.dynamicPrice !== b.dynamicPrice ||
    a.displayPrice !== b.displayPrice ||
    a.tonAmount !== b.tonAmount ||
    a.dctAmount !== b.dctAmount ||
    a.tonRate !== b.tonRate ||
    a.deltaPercent !== b.deltaPercent
  ) {
    return false;
  }

  if (a.adjustments.length !== b.adjustments.length) {
    return false;
  }

  for (let index = 0; index < a.adjustments.length; index += 1) {
    const current = a.adjustments[index];
    const next = b.adjustments[index];
    if (current.key !== next.key || current.value !== next.value) {
      return false;
    }
  }

  return true;
}

export function arePlanOptionsEqual(a: PlanOption[], b: PlanOption[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }

  const map = new Map<Plan, PlanOption>(a.map((option) => [option.id, option]));
  for (const option of b) {
    const current = map.get(option.id);
    if (!current) {
      return false;
    }

    if (
      current.name !== option.name ||
      current.price !== option.price ||
      current.cadence !== option.cadence ||
      current.description !== option.description
    ) {
      return false;
    }

    if (current.highlights.length !== option.highlights.length) {
      return false;
    }
    for (let index = 0; index < current.highlights.length; index += 1) {
      if (current.highlights[index] !== option.highlights[index]) {
        return false;
      }
    }

    const currentMeta = current.meta;
    const nextMeta = option.meta;
    if (
      currentMeta.currency !== nextMeta.currency ||
      currentMeta.amount !== nextMeta.amount ||
      currentMeta.tonAmount !== nextMeta.tonAmount ||
      currentMeta.dctAmount !== nextMeta.dctAmount ||
      currentMeta.updatedAt !== nextMeta.updatedAt ||
      currentMeta.snapshotSignature !== nextMeta.snapshotSignature ||
      (currentMeta.snapshotSignature === null &&
        !areNormalizedSnapshotsEqual(currentMeta.snapshot, nextMeta.snapshot))
    ) {
      return false;
    }
  }

  return true;
}

export function arePlanSyncStatusesEqual(
  a: PlanSyncStatus,
  b: PlanSyncStatus,
): boolean {
  return (
    a.isLoading === b.isLoading &&
    a.isRealtimeSyncing === b.isRealtimeSyncing &&
    a.updatedAt === b.updatedAt &&
    (a.error ?? null) === (b.error ?? null)
  );
}

const ISO_TIMESTAMP_CACHE_LIMIT = 128;
const isoTimestampCache = new Map<string, number | null>();

export function parseIsoTimestamp(iso?: string | null): number | null {
  if (!iso) {
    return null;
  }

  if (isoTimestampCache.has(iso)) {
    return isoTimestampCache.get(iso) ?? null;
  }

  const parsed = Date.parse(iso);
  const normalized = Number.isFinite(parsed) ? parsed : null;
  if (!isoTimestampCache.has(iso) && isoTimestampCache.size >= ISO_TIMESTAMP_CACHE_LIMIT) {
    const oldestKey = isoTimestampCache.keys().next().value;
    if (typeof oldestKey === "string") {
      isoTimestampCache.delete(oldestKey);
    }
  }
  isoTimestampCache.set(iso, normalized);
  return normalized;
}

const relativeTimeFormatter =
  typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl
    ? new Intl.RelativeTimeFormat(undefined, {
        style: "narrow",
        numeric: "auto",
      })
    : null;

export function formatRelativeTime(iso?: string): string {
  const parsed = parseIsoTimestamp(iso);
  if (parsed === null) {
    return "just now";
  }
  const diffMs = Date.now() - parsed;
  if (diffMs <= 0) {
    return "just now";
  }
  const diffSeconds = Math.floor(diffMs / 1000);
  if (!relativeTimeFormatter) {
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];

  let duration = diffSeconds;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      const value = Math.max(1, Math.floor(duration));
      return relativeTimeFormatter.format(-value, division.unit);
    }
    duration /= division.amount;
  }

  return "just now";
}

export function formatConfidence(value?: number): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const bounded = Math.min(Math.max(value, 0), 1);
  return `${Math.round(bounded * 100)}% confidence`;
}

export function riskSeverity(score?: number): "low" | "medium" | "high" {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "low";
  }
  if (score < 0.34) {
    return "low";
  }
  if (score < 0.67) {
    return "medium";
  }
  return "high";
}

export const FALLBACK_METRICS: LiveMetric[] = [
  {
    label: "Projected desk yield",
    value: "18–24% APY",
    change: "Desk baseline",
    trend: "steady",
  },
  {
    label: "Live trading pairs",
    value: "12 curated",
    change: "Auto-managed",
    trend: "steady",
  },
  {
    label: "Withdrawal buffer",
    value: "4 hour SLA",
    change: "Standard",
    trend: "steady",
  },
];

export const OVERVIEW_FEATURES = [
  {
    title: "Live Signal Desk",
    description:
      "High-conviction execution with 24/7 desk monitoring across majors, TON ecosystem, and DeFi rotations.",
  },
  {
    title: "Auto-Invest Vaults",
    description:
      "Deploy into curated baskets that rebalance automatically with transparent on-chain attestations.",
  },
  {
    title: "Risk Controls",
    description:
      "Dynamic guardrails, circuit breakers, and managed drawdown ceilings purpose-built for active traders.",
  },
];

export const ACTIVITY_FEED: LiveTimelineEntry[] = [
  {
    title: "Desk sync complete",
    status: "complete",
    timestamp: "12:04",
    description:
      "Wallet authorized with trading desk. Next rebalancing cycle triggers at 18:00 UTC.",
  },
  {
    title: "Strategy review",
    status: "pending",
    timestamp: "Today",
    description:
      "Bronze plan summary ready. Confirm subscription to unlock full auto-invest routing.",
  },
  {
    title: "Capital deployment window",
    status: "upcoming",
    timestamp: "Tomorrow",
    description:
      "Desk will open a short deployment window for high-volume TON liquidity pairs.",
  },
];

export const SUPPORT_OPTIONS = [
  {
    title: "Concierge chat",
    description:
      "Direct line to our desk managers for allocation or compliance questions.",
    action: "Open Telegram thread",
  },
  {
    title: "Trading playbook",
    description:
      "Step-by-step frameworks and risk tooling to mirror the Dynamic Capital approach.",
    action: "View docs",
  },
  {
    title: "Status center",
    description:
      "Check live uptime for deposits, OCR, and auto-invest execution engines.",
    action: "Launch status page",
  },
];

export function resolvePlanUpdatedAt(options: PlanOption[]): string | undefined {
  let latestTimestamp = Number.NEGATIVE_INFINITY;
  for (const option of options) {
    const timestamp = option.meta.updatedAt;
    if (!timestamp) continue;
    const parsed = parseIsoTimestamp(timestamp);
    if (parsed === null) continue;
    if (parsed > latestTimestamp) {
      latestTimestamp = parsed;
    }
  }

  if (!Number.isFinite(latestTimestamp) || latestTimestamp === Number.NEGATIVE_INFINITY) {
    return undefined;
  }

  return new Date(latestTimestamp).toISOString();
}

export const HERO_GRADIENT: CSSProperties = {
  background:
    "radial-gradient(circle at top, rgba(54, 106, 255, 0.25), transparent 45%)," +
    " radial-gradient(circle at 80% 20%, rgba(97, 209, 255, 0.18), transparent 42%)," +
    " linear-gradient(180deg, #05070f 0%, #05070f 60%, #0a1121 100%)",
};
