"use client";

import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import type {
  ActionConfiguration,
  SendTransactionRequest,
  TonConnectUI,
} from "@tonconnect/ui-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, JSX } from "react";
import {
  useMiniAppThemeManager,
} from "@shared/miniapp/use-miniapp-theme";
import { TONCONNECT_WALLETS_LIST_CONFIGURATION } from "@shared/ton/tonconnect-wallets";
import type {
  MiniAppThemeOption,
  TonConnectLike,
} from "@shared/miniapp/theme-loader";
import {
  isSupportedPlan,
  linkTonMiniAppWallet,
  type Plan,
  processTonMiniAppSubscription,
  deriveTonTransactionHash,
} from "../lib/ton-miniapp-helper";

import type {
  LiveIntelSnapshot,
  LiveMetric,
  LiveTimelineEntry,
} from "../data/live-intel";
import { DEFAULT_REFRESH_SECONDS } from "../data/live-intel";
import { getSupabaseClient } from "../lib/supabase-client";
import {
  DYNAMIC_TON_API_USER_ID,
  OPS_TREASURY_ADDRESS,
  TONCONNECT_TWA_RETURN_URL,
} from "../lib/config";
import { THEME_MINT_PLANS, type ThemeMintPlan } from "../data/theme-mints";
import { TON_MANIFEST_RESOURCE_PATH, TON_MANIFEST_URL_CANDIDATES } from "@shared/ton/manifest";
import { TON_MANIFEST_FALLBACK_DATA_URL } from "../lib/ton-manifest-inline";
import { resolveTonManifestUrl } from "../lib/ton-manifest-resolver";

type SectionId =
  | "overview"
  | "plans"
  | "minting"
  | "intel"
  | "activity"
  | "appearance"
  | "support";

type TelegramUser = {
  id?: number;
};

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramUser;
  };
};

type TelegramGlobal = {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

type PlanOption = {
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
    snapshot: Record<string, unknown> | null;
  };
};

type RawPlan = {
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

type ActivityItem = LiveTimelineEntry;

type MintingPlanState =
  | { status: "idle"; progress: 0 }
  | { status: "starting"; progress: number }
  | { status: "success"; progress: 100; startedAt?: string }
  | { status: "error"; progress: number; error: string };

type SupportOption = {
  title: string;
  description: string;
  action: string;
};

type NavItem = {
  id: SectionId;
  label: string;
  icon: (props: { active: boolean }) => JSX.Element;
};

type TonConnectManifestState = {
  manifestUrl: string | null;
  resolving: boolean;
  error: string | null;
  retry: () => void;
};

const TON_MANIFEST_FALLBACK_MESSAGE =
  "We’re using a bundled TON Connect manifest because the live manifest is unreachable. Wallet availability may be limited until the connection is restored.";

const TON_MANIFEST_FATAL_MESSAGE =
  "We couldn’t reach the TON Connect manifest. Please check your connection and try again.";

function useTonConnectManifestUrl(): TonConnectManifestState {
  const [state, setState] = useState<Omit<TonConnectManifestState, "retry">>({
    manifestUrl: null,
    resolving: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkCandidates(): Promise<void> {
      const manifestCandidates = Array.from(
        new Set(
          [
            ...(typeof window !== "undefined"
              ? [
                  new URL(
                    TON_MANIFEST_RESOURCE_PATH,
                    window.location.origin,
                  ).toString(),
                ]
              : []),
            ...TON_MANIFEST_URL_CANDIDATES,
          ],
        ),
      );

      try {
        const resolved = await resolveTonManifestUrl({
          candidates: manifestCandidates,
        });

        if (cancelled) {
          return;
        }

        if (resolved) {
          setState({ manifestUrl: resolved, resolving: false, error: null });
          return;
        }

        setState({
          manifestUrl: TON_MANIFEST_FALLBACK_DATA_URL,
          resolving: false,
          error: TON_MANIFEST_FALLBACK_MESSAGE,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to resolve TON Connect manifest", error);
        setState({
          manifestUrl: TON_MANIFEST_FALLBACK_DATA_URL,
          resolving: false,
          error: TON_MANIFEST_FALLBACK_MESSAGE,
        });
      }
    }

    void checkCandidates();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({
      manifestUrl: previous.manifestUrl,
      resolving: true,
      error: null,
    }));
    setAttempt((value) => value + 1);
  }, []);

  return useMemo(
    () => ({
      manifestUrl: state.manifestUrl,
      resolving: state.resolving,
      error: state.error,
      retry,
    }),
    [state.error, state.manifestUrl, state.resolving, retry],
  );
}

const SECTION_IDS: SectionId[] = [
  "overview",
  "plans",
  "minting",
  "intel",
  "activity",
  "appearance",
  "support",
];

const TONCONNECT_ACTIONS_CONFIGURATION =
  resolveTonConnectActionsConfiguration();

const CHAT_LAUNCHER_SCROLL_THRESHOLD = 220;

function createDefaultMintingState(): Record<number, MintingPlanState> {
  return Object.fromEntries(
    THEME_MINT_PLANS.map((plan) => [
      plan.index,
      { status: "idle", progress: 0 } as MintingPlanState,
    ]),
  );
}

type TonConnectAccountLike = NonNullable<TonConnectLike["account"]>;

function resolveTonConnectActionsConfiguration():
  | ActionConfiguration
  | undefined {
  if (!TONCONNECT_TWA_RETURN_URL) {
    return undefined;
  }

  const trimmed = TONCONNECT_TWA_RETURN_URL.trim();
  if (!trimmed || !trimmed.includes("://")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[miniapp] Ignoring TONCONNECT_TWA_RETURN_URL without protocol",
        trimmed,
      );
    }
    return undefined;
  }

  return {
    returnStrategy: "back",
    twaReturnUrl: trimmed as `${string}://${string}`,
  };
}

function toTonConnectThemeSource(
  instance: TonConnectUI | null,
): TonConnectLike | null {
  if (!instance) {
    return null;
  }

  const toAccountLike = (value: unknown): TonConnectAccountLike | null => {
    if (!value || typeof value !== "object") {
      return null;
    }
    const candidate = value as { address?: unknown };
    const address = candidate.address;
    if (typeof address === "string" && address.trim().length > 0) {
      return { address };
    }
    return null;
  };

  const account = toAccountLike(instance.account);

  return {
    account,
    onStatusChange: (listener) =>
      instance.onStatusChange((wallet) => {
        listener(toAccountLike(wallet?.account ?? null));
      }),
  };
}

type LiveIntelState = {
  status: "loading" | "ready" | "error";
  report?: LiveIntelSnapshot;
  updatedAt?: string;
  nextRefreshSeconds?: number;
  isSyncing: boolean;
  error?: string;
};

type PlanSyncStatus = {
  isLoading: boolean;
  isRealtimeSyncing: boolean;
  updatedAt?: string;
  error?: string | null;
};

const FALLBACK_PLAN_OPTIONS: PlanOption[] = [
  {
    id: "vip_bronze",
    name: "VIP Bronze",
    price: "120 TON",
    cadence: "3 month horizon",
    description:
      "Entry tier that mirrors the desk's base auto-invest strategy.",
    highlights: [
      "Desk monitored entries",
      "Weekly strategy calls",
      "Capital preservation guardrails",
    ],
    meta: {
      currency: "TON",
      amount: 120,
      tonAmount: 120,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
    },
  },
  {
    id: "vip_silver",
    name: "VIP Silver",
    price: "220 TON",
    cadence: "6 month horizon",
    description:
      "Expanded allocation with leverage-managed exposure and mid-cycle rotations.",
    highlights: [
      "Dual momentum + carry blend",
      "Priority support window",
      "Quarterly performance briefing",
    ],
    meta: {
      currency: "TON",
      amount: 220,
      tonAmount: 220,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
    },
  },
  {
    id: "vip_gold",
    name: "VIP Gold",
    price: "420 TON",
    cadence: "12 month horizon",
    description:
      "Full desk collaboration with access to structured products and vault strategies.",
    highlights: [
      "Structured product desk",
      "Liquidity provisioning slots",
      "Desk escalation on demand",
    ],
    meta: {
      currency: "TON",
      amount: 420,
      tonAmount: 420,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
    },
  },
  {
    id: "mentorship",
    name: "Mentorship Circle",
    price: "650 TON",
    cadence: "12 month horizon",
    description:
      "One-on-one mentorship with the desk's senior PMs and quarterly onsite reviews.",
    highlights: [
      "Dedicated mentor queue",
      "Quarterly onsite review",
      "Capital introduction pathway",
    ],
    meta: {
      currency: "TON",
      amount: 650,
      tonAmount: 650,
      dctAmount: null,
      updatedAt: null,
      snapshot: null,
    },
  },
];

const FALLBACK_PLAN_LOOKUP: Record<Plan, PlanOption> = Object.fromEntries(
  FALLBACK_PLAN_OPTIONS.map((option) => [option.id, option]),
) as Record<Plan, PlanOption>;

type PlanVisual = {
  accent: string;
  accentStrong: string;
  soft: string;
  glow: string;
  sheen: string;
  surface: string;
  shadow: string;
  tagline: string;
};

const PLAN_VISUALS: Record<Plan | "default", PlanVisual> = {
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

function getPlanVisual(plan?: Plan | null): PlanVisual {
  if (!plan) {
    return PLAN_VISUALS.default;
  }
  return PLAN_VISUALS[plan] ?? PLAN_VISUALS.default;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractSnapshotNumber(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
): number | string | null {
  if (!snapshot) return null;
  const value = snapshot[key];
  return typeof value === "number" || typeof value === "string"
    ? value
    : null;
}

function extractSnapshotString(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!snapshot) return null;
  const value = snapshot[key];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

type NormalizedPlanSnapshot = {
  computedAt: string | null;
  basePrice: number | null;
  dynamicPrice: number | null;
  displayPrice: number | null;
  tonAmount: number | null;
  dctAmount: number | null;
  tonRate: number | null;
  deltaPercent: number | null;
  adjustments: Array<{ key: string; value: number }>;
};

function normalisePlanSnapshot(
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
    tonRate = coerceNumber((tonRateSource as Record<string, unknown>).rate) ??
      null;
  }

  const adjustments = record.adjustments &&
      typeof record.adjustments === "object" &&
      !Array.isArray(record.adjustments)
    ? Object.entries(record.adjustments as Record<string, unknown>)
      .map(([key, value]) => ({ key, value: coerceNumber(value) }))
      .filter((item): item is { key: string; value: number } =>
        typeof item.value === "number"
      )
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    : [];

  return {
    computedAt: extractSnapshotString(record, "computed_at"),
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

function formatCurrencyAmount(
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

  const fixedDigits = maximumFractionDigits > 0
    ? amount.toFixed(Math.min(4, maximumFractionDigits))
    : Math.round(amount).toString();
  return `${fixedDigits} ${currency}`;
}

function formatPlanLabel(
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

function normalisePlanOptions(plans: RawPlan[]): PlanOption[] {
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
    const amount = coerceNumber(raw.price) ??
      coerceNumber(raw.base_price) ??
      coerceNumber(raw.dynamic_price_usdt);
    const isLifetime = raw.is_lifetime === true;
    const duration = coerceNumber(raw.duration_months) ?? 0;
    const priceLabel = amount !== null
      ? formatPlanLabel(currency, amount, isLifetime, duration)
      : fallback.price;
    const highlights = Array.isArray(raw.features)
      ? raw.features.filter((feature): feature is string =>
        typeof feature === "string" && feature.trim().length > 0
      )
      : fallback.highlights;

    const snapshot = raw.performance_snapshot ?? null;
    const tonAmount = coerceNumber(raw.ton_amount) ??
      coerceNumber(extractSnapshotNumber(snapshot, "ton_amount")) ??
      fallback.meta.tonAmount ?? null;
    const dctAmount = coerceNumber(raw.dct_amount) ??
      coerceNumber(extractSnapshotNumber(snapshot, "dct_amount"));
    const computedAt = extractSnapshotString(snapshot, "computed_at");
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
        snapshot,
      },
    });
  }

  return nextOptions.length > 0 ? nextOptions : [...FALLBACK_PLAN_OPTIONS];
}

function formatPercent(value: number | null, fractionDigits = 2): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${abs.toFixed(fractionDigits)}%`;
}

function formatAdjustmentLabel(key: string): string {
  if (!key) {
    return "Adjustment";
  }
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function arePlanOptionsEqual(a: PlanOption[], b: PlanOption[]): boolean {
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
    const snapshotsMatch = JSON.stringify(currentMeta.snapshot ?? null) ===
      JSON.stringify(nextMeta.snapshot ?? null);
    if (
      currentMeta.currency !== nextMeta.currency ||
      currentMeta.amount !== nextMeta.amount ||
      currentMeta.tonAmount !== nextMeta.tonAmount ||
      currentMeta.dctAmount !== nextMeta.dctAmount ||
      currentMeta.updatedAt !== nextMeta.updatedAt ||
      !snapshotsMatch
    ) {
      return false;
    }
  }

  return true;
}

function arePlanSyncStatusesEqual(
  a: PlanSyncStatus,
  b: PlanSyncStatus,
): boolean {
  return a.isLoading === b.isLoading &&
    a.isRealtimeSyncing === b.isRealtimeSyncing &&
    a.updatedAt === b.updatedAt &&
    (a.error ?? null) === (b.error ?? null);
}

function resolvePlanUpdatedAt(options: PlanOption[]): string | undefined {
  let latestTimestamp = Number.NEGATIVE_INFINITY;
  for (const option of options) {
    const timestamp = option.meta.updatedAt;
    if (!timestamp) continue;
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) continue;
    if (parsed > latestTimestamp) {
      latestTimestamp = parsed;
    }
  }

  if (!Number.isFinite(latestTimestamp) || latestTimestamp === Number.NEGATIVE_INFINITY) {
    return undefined;
  }

  return new Date(latestTimestamp).toISOString();
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const relativeTimeFormatter = typeof Intl !== "undefined" &&
    "RelativeTimeFormat" in Intl
  ? new Intl.RelativeTimeFormat(undefined, {
    style: "narrow",
    numeric: "auto",
  })
  : null;

function formatRelativeTime(iso?: string): string {
  if (!iso) {
    return "just now";
  }
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
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

function formatConfidence(value?: number): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const bounded = Math.min(Math.max(value, 0), 1);
  return `${Math.round(bounded * 100)}% confidence`;
}

function riskSeverity(score?: number): "low" | "medium" | "high" {
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

const FALLBACK_METRICS: LiveMetric[] = [
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

type LiveIntelResponse = {
  generatedAt: string;
  nextUpdateInSeconds?: number;
  report: LiveIntelSnapshot;
};

function useLiveIntel(
  pollMs: number = DEFAULT_REFRESH_SECONDS * 1000,
): LiveIntelState & { refresh: () => void } {
  const [state, setState] = useState<LiveIntelState>({
    status: "loading",
    isSyncing: true,
  });
  const isUnmounted = useRef(false);

  const fetchIntel = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      status: previous.report ? previous.status : "loading",
      isSyncing: true,
      error: previous.report ? previous.error : undefined,
    }));

    try {
      const response = await fetch("/api/live-intel", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload: LiveIntelResponse = await response.json();
      if (isUnmounted.current) {
        return;
      }
      setState({
        status: "ready",
        report: payload.report,
        updatedAt: payload.generatedAt,
        nextRefreshSeconds: payload.nextUpdateInSeconds ??
          Math.floor(pollMs / 1000),
        isSyncing: false,
        error: undefined,
      });
    } catch (error) {
      if (isUnmounted.current) {
        return;
      }
      const message = error instanceof Error
        ? error.message
        : "Unknown sync error";
      setState((previous) => ({
        ...previous,
        status: previous.report ? "ready" : "error",
        isSyncing: false,
        error: message,
      }));
    }
  }, [pollMs]);

  useEffect(() => {
    isUnmounted.current = false;
    void fetchIntel();
    const intervalId = setInterval(() => {
      void fetchIntel();
    }, pollMs);

    return () => {
      isUnmounted.current = true;
      clearInterval(intervalId);
    };
  }, [fetchIntel, pollMs]);

  return {
    ...state,
    refresh: fetchIntel,
  };
}

const OVERVIEW_FEATURES = [
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

const ACTIVITY_FEED: ActivityItem[] = [
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

const SUPPORT_OPTIONS: SupportOption[] = [
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

function useTelegramId(): string {
  const isBrowser = typeof globalThis !== "undefined" &&
    typeof (globalThis as { window?: unknown }).window !== "undefined";
  if (!isBrowser) {
    return DYNAMIC_TON_API_USER_ID;
  }

  const telegram = (globalThis as TelegramGlobal).Telegram;
  const telegramId = telegram?.WebApp?.initDataUnsafe?.user?.id;
  return telegramId ? String(telegramId) : DYNAMIC_TON_API_USER_ID;
}

function useCompactChatLauncher(
  threshold: number = CHAT_LAUNCHER_SCROLL_THRESHOLD,
): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId: number | null = null;

    const evaluate = () => {
      rafId = null;
      const shouldCompact = window.scrollY > threshold;
      setIsCompact((previous) =>
        previous === shouldCompact ? previous : shouldCompact
      );
    };

    const handleScroll = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(evaluate);
    };

    evaluate();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return isCompact;
}

function formatWalletAddress(address?: string | null): string {
  if (!address) {
    return "No wallet connected";
  }
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function resolveThemeSwatches(theme: MiniAppThemeOption): string[] {
  const background = theme.cssVariables["--tg-bg"] ??
    theme.cssVariables["--surface"] ??
    "#0b1120";
  const accent = theme.cssVariables["--tg-accent"] ??
    theme.cssVariables["--accent"] ??
    "#38bdf8";
  const text = theme.cssVariables["--tg-text"] ??
    theme.cssVariables["--text-primary"] ??
    "#f8fafc";
  return [background, accent, text];
}

function HomeInner() {
  const [tonConnectUI] = useTonConnectUI();
  const tonConnectThemeSource = useMemo(
    () => toTonConnectThemeSource(tonConnectUI ?? null),
    [tonConnectUI],
  );
  const [planOptions, setPlanOptions] = useState<PlanOption[]>(
    () => [...FALLBACK_PLAN_OPTIONS],
  );
  const [plan, setPlan] = useState<Plan>(FALLBACK_PLAN_OPTIONS[0].id);
  const [planSyncStatus, setPlanSyncStatus] = useState<PlanSyncStatus>({
    isLoading: true,
    isRealtimeSyncing: false,
    updatedAt: undefined,
    error: null,
  });
  const [txHash, setTxHash] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [isLinking, setIsLinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mintingStates, setMintingStates] = useState<Record<number, MintingPlanState>>(
    createDefaultMintingState,
  );
  const telegramId = useTelegramId();
  const liveIntel = useLiveIntel();
  const [countdown, setCountdown] = useState<number | null>(null);
  const isChatCompact = useCompactChatLauncher();
  const { manager: themeManager, state: themeState } = useMiniAppThemeManager(
    tonConnectThemeSource,
  );
  const mintingProgressTimers = useRef<Record<number, number>>({});

  const updatePlanSyncStatus = useCallback(
    (updater: (previous: PlanSyncStatus) => PlanSyncStatus) => {
      setPlanSyncStatus((previous) => {
        const next = updater(previous);
        return arePlanSyncStatusesEqual(previous, next) ? previous : next;
      });
    },
    [],
  );

  const selectedPlan = useMemo(
    () => planOptions.find((option) => option.id === plan),
    [plan, planOptions],
  );
  const activePlanVisual = useMemo(
    () => getPlanVisual(selectedPlan?.id ?? null),
    [selectedPlan?.id],
  );
  const dynamicAccentStyles = useMemo(
    () =>
      ({
        "--accent": activePlanVisual.accent,
        "--accent-strong": activePlanVisual.accentStrong,
        "--accent-soft": activePlanVisual.soft,
        "--ui-accent": activePlanVisual.accent,
        "--ui-accent-soft": activePlanVisual.soft,
        "--ui-glow": activePlanVisual.glow,
        "--ui-sheen": activePlanVisual.sheen,
        "--ui-surface": activePlanVisual.surface,
        "--ui-shadow": activePlanVisual.shadow,
      }) as CSSProperties,
    [activePlanVisual],
  );
  const planTonLabel = useMemo(() => {
    const tonAmount = selectedPlan?.meta.tonAmount;
    if (typeof tonAmount === "number") {
      return tonAmount.toLocaleString(undefined, {
        minimumFractionDigits: tonAmount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: tonAmount % 1 === 0 ? 0 : 2,
      });
    }
    return null;
  }, [selectedPlan?.meta.tonAmount]);
  const planDctLabel = useMemo(() => {
    const dctAmount = selectedPlan?.meta.dctAmount;
    if (typeof dctAmount === "number") {
      return dctAmount.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });
    }
    return null;
  }, [selectedPlan?.meta.dctAmount]);
  const planUpdatedLabel = useMemo(() => {
    const updatedAt = selectedPlan?.meta.updatedAt;
    return updatedAt ? formatRelativeTime(updatedAt) : null;
  }, [selectedPlan?.meta.updatedAt]);
  const planSnapshot = useMemo(() => {
    const snapshot = selectedPlan?.meta.snapshot;

    if (!snapshot) {
      return null;
    }

    return normalisePlanSnapshot(snapshot);
  }, [selectedPlan?.meta.snapshot]);
  const planSnapshotCurrency = useMemo(
    () => selectedPlan?.meta.currency ?? null,
    [selectedPlan?.meta.currency],
  );
  const wallet = tonConnectUI?.account;
  const walletAddress = wallet?.address;

  const themeOptions = themeState.availableThemes;
  const walletConnected = Boolean(walletAddress);
  const isThemeBusy = themeState.isLoading || themeState.isApplying;
  const themeEmptyCopy = walletConnected
    ? "When a Theme NFT is detected it will appear here with the option to preview and apply it instantly."
    : "Connect a TON wallet above to see any Theme NFTs you've collected.";
  const themeStatusMessage = useMemo(() => {
    if (themeState.isApplying) {
      return "Applying theme…";
    }
    if (!walletConnected) {
      return "Connect a TON wallet to unlock partner themes.";
    }
    if (themeState.isLoading) {
      return "Checking your Theme NFTs…";
    }
    if (!themeOptions.length) {
      return "No Theme NFTs detected yet. Refresh after minting.";
    }
    return null;
  }, [
    themeOptions.length,
    themeState.isApplying,
    themeState.isLoading,
    walletConnected,
  ]);

  const handleThemeSelect = useCallback(
    (theme: MiniAppThemeOption) => {
      void themeManager.selectTheme(theme.id);
    },
    [themeManager],
  );

  const handleThemeReset = useCallback(() => {
    void themeManager.resetTheme();
  }, [themeManager]);

  const handleThemeRefresh = useCallback(() => {
    void themeManager.refresh();
  }, [themeManager]);

  const clearMintingTimer = useCallback((planIndex: number) => {
    if (typeof window === "undefined") {
      mintingProgressTimers.current = {};
      return;
    }
    const timers = mintingProgressTimers.current;
    const timerId = timers[planIndex];
    if (typeof timerId === "number") {
      window.clearInterval(timerId);
      delete timers[planIndex];
    }
  }, []);

  const startThemeMint = useCallback(
    async (plan: ThemeMintPlan) => {
      const existingState = mintingStates[plan.index];
      if (existingState?.status === "starting") {
        return;
      }

      setMintingStates((previous) => ({
        ...previous,
        [plan.index]: { status: "starting", progress: 12 },
      }));

      if (typeof window !== "undefined") {
        clearMintingTimer(plan.index);
        mintingProgressTimers.current[plan.index] = window.setInterval(() => {
          setMintingStates((prev) => {
            const current = prev[plan.index];
            if (!current || current.status !== "starting") {
              return prev;
            }
            const increment = 6 + Math.random() * 12;
            const nextProgress = Math.min(
              95,
              Math.round(current.progress + increment),
            );
            if (nextProgress <= current.progress) {
              return prev;
            }
            return {
              ...prev,
              [plan.index]: { ...current, progress: nextProgress },
            };
          });
        }, 900);
      }

      try {
        const response = await fetch("/api/minting/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mintIndex: plan.index,
            planName: plan.name,
            contentUri: plan.contentUri,
            priority: plan.defaultPriority,
            initiator: telegramId,
          }),
        });

        let payload: unknown = null;
        const contentType = response.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
        }

        if (!response.ok) {
          const errorMessage =
            typeof payload === "object" && payload && "error" in payload
              ? String((payload as { error?: unknown }).error ?? "Mint start failed")
              : `Mint start failed (HTTP ${response.status})`;
          throw new Error(errorMessage);
        }

        const mintRecord =
          typeof payload === "object" && payload && "mint" in payload
            ? (payload as { mint?: { started_at?: string | null } }).mint ?? null
            : null;
        const startedAt =
          mintRecord && typeof mintRecord.started_at === "string"
            ? mintRecord.started_at
            : undefined;

        clearMintingTimer(plan.index);
        setMintingStates((previous) => ({
          ...previous,
          [plan.index]: { status: "success", startedAt, progress: 100 },
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to reach the minting service. Please try again shortly.";
        clearMintingTimer(plan.index);
        setMintingStates((previous) => {
          const current = previous[plan.index];
          const fallbackProgress =
            current && current.status === "starting" ? current.progress : 0;
          return {
            ...previous,
            [plan.index]: {
              status: "error",
              error: message,
              progress: fallbackProgress,
            },
          };
        });
      }
    },
    [clearMintingTimer, mintingStates, telegramId],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    return () => {
      const timers = { ...mintingProgressTimers.current };
      Object.keys(timers).forEach((key) => {
        clearMintingTimer(Number(key));
      });
    };
  }, [clearMintingTimer]);

  const metrics = liveIntel.report?.metrics ?? FALLBACK_METRICS;
  const timeline = liveIntel.report?.timeline ?? ACTIVITY_FEED;

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) {
          return;
        }
        const candidateId = visible[0].target.id as SectionId;
        if (!SECTION_IDS.includes(candidateId)) {
          return;
        }
        setActiveSection((previous) =>
          previous === candidateId ? previous : candidateId
        );
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0.2, 0.4, 0.6, 0.8] },
    );

    SECTION_IDS.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let pendingController: AbortController | null = null;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const loadPlans = async (options: { showSpinner: boolean }) => {
      if (!isMounted) {
        return;
      }

      if (pendingController) {
        pendingController.abort();
      }

      const controller = new AbortController();
      pendingController = controller;

      updatePlanSyncStatus((previous) => ({
        ...previous,
        isLoading: options.showSpinner,
        isRealtimeSyncing: !options.showSpinner,
      }));

      try {
        const response = await fetch("/api/plans", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const payload = await response.json() as { plans?: RawPlan[] | null };
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        const normalized = Array.isArray(payload?.plans)
          ? normalisePlanOptions(payload.plans as RawPlan[])
          : [...FALLBACK_PLAN_OPTIONS];

        setPlanOptions((previous) =>
          arePlanOptionsEqual(previous, normalized) ? previous : normalized
        );
        setPlan((current) =>
          normalized.some((option) => option.id === current)
            ? current
            : normalized[0]?.id ?? current
        );
        const nextStatus: PlanSyncStatus = {
          isLoading: false,
          isRealtimeSyncing: false,
          updatedAt: resolvePlanUpdatedAt(normalized),
          error: null,
        };
        updatePlanSyncStatus(() => nextStatus);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[miniapp] Failed to load plans", error);
        if (!isMounted) {
          return;
        }

        setPlanOptions((previous) =>
          previous.length ? previous : [...FALLBACK_PLAN_OPTIONS]
        );
        updatePlanSyncStatus((previous) => ({
          isLoading: false,
          isRealtimeSyncing: false,
          updatedAt: previous.updatedAt,
          error: error instanceof Error
            ? error.message
            : "Unable to load plans",
        }));
      } finally {
        if (pendingController === controller) {
          pendingController = null;
        }
      }
    };

    void loadPlans({ showSpinner: true });

    const supabase = getSupabaseClient();
    if (!supabase) {
      updatePlanSyncStatus((previous) => ({
        ...previous,
        isLoading: false,
        isRealtimeSyncing: false,
        error: previous.error ??
          "Realtime sync unavailable (missing Supabase env)",
      }));
      return () => {
        isMounted = false;
        if (pendingController) {
          pendingController.abort();
        }
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
      };
    }

    const scheduleRealtimeRefresh = () => {
      updatePlanSyncStatus((previous) => {
        if (previous.isRealtimeSyncing) {
          return previous;
        }
        return { ...previous, isRealtimeSyncing: true };
      });

      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        refreshTimeout = null;
        void loadPlans({ showSpinner: false });
      }, 250);
    };

    const channel = supabase
      .channel("miniapp-subscription-plans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_plans" },
        () => {
          if (!isMounted) {
            return;
          }
          scheduleRealtimeRefresh();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (pendingController) {
        pendingController.abort();
      }
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [updatePlanSyncStatus]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (liveIntel.nextRefreshSeconds == null) {
      setCountdown(null);
      return;
    }
    setCountdown(liveIntel.nextRefreshSeconds);
    const intervalId = setInterval(() => {
      setCountdown((previous) => {
        if (previous === null) {
          return previous;
        }
        if (previous <= 1) {
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [liveIntel.updatedAt, liveIntel.nextRefreshSeconds]);

  async function linkWallet() {
    if (!tonConnectUI) {
      return;
    }

    const currentWallet = tonConnectUI.account;
    if (!currentWallet) {
      setStatusMessage("Connect a TON wallet to link it to the desk.");
      return;
    }

    setIsLinking(true);
    setStatusMessage(null);

    const result = await linkTonMiniAppWallet({
      telegramId,
      wallet: currentWallet,
    });

    setIsLinking(false);

    if (!result.ok) {
      console.error("[miniapp] Wallet link failed", result.error);
      setStatusMessage(
        result.error ??
          "Unable to link your wallet right now. Please retry in a few moments.",
      );
      return;
    }

    setStatusMessage("Wallet linked successfully. Desk access unlocked.");
  }

  async function startSubscription() {
    if (!tonConnectUI) {
      return;
    }

    const currentWallet = tonConnectUI.account;
    if (!currentWallet) {
      setStatusMessage("Connect a TON wallet to continue.");
      return;
    }

    const tonAmount = selectedPlan?.meta.tonAmount;
    if (!tonAmount || !Number.isFinite(tonAmount) || tonAmount <= 0) {
      setStatusMessage(
        "Subscription pricing unavailable right now. Refresh and try again shortly.",
      );
      return;
    }

    const treasuryAddress = OPS_TREASURY_ADDRESS;
    if (!treasuryAddress) {
      setStatusMessage(
        "Desk intake wallet unavailable. Please contact support to continue.",
      );
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Confirm the transfer in your TON wallet…");
    setTxHash("");

    const nanotons = BigInt(Math.ceil(tonAmount * 1_000_000_000));
    const transaction: SendTransactionRequest = {
      validUntil: Math.floor(Date.now() / 1000) + 60 * 10,
      messages: [
        {
          address: treasuryAddress,
          amount: nanotons.toString(),
        },
      ],
    };

    try {
      const walletResponse = await tonConnectUI.sendTransaction(transaction);
      const boc = walletResponse?.boc;

      if (!boc) {
        throw new Error("Wallet did not return a signed transaction");
      }

      const derivedHash = deriveTonTransactionHash(boc);
      if (!derivedHash) {
        throw new Error("Unable to derive transaction hash from wallet response");
      }

      setTxHash(derivedHash);
      setStatusMessage("Transaction broadcasted. Verifying with the desk…");

      const result = await processTonMiniAppSubscription({
        telegramId,
        plan,
        txHash: derivedHash,
      });

      if (!result.ok) {
        console.error("[miniapp] Subscription request failed", result.error);
        setStatusMessage(
          result.error ??
            "We couldn't start the subscription. Give it another try after checking your connection.",
        );
        return;
      }

      setStatusMessage(
        `Subscription for ${
          selectedPlan?.name ?? "your plan"
        } submitted. Desk will confirm shortly.`,
      );
    } catch (error) {
      console.error("[miniapp] TON transaction request failed", error);
      const rejection =
        typeof (error as { code?: number })?.code === "number" &&
          (error as { code: number }).code === 300
          ? "Transaction cancelled in wallet. No funds were moved."
          : null;

      setStatusMessage(
        rejection ??
          "We couldn't start the subscription. Give it another try after checking your connection.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const scrollToSection = useCallback(
    (sectionId: SectionId) => {
      if (typeof window === "undefined") {
        return;
      }

      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSection(sectionId);
      }
    },
    [setActiveSection],
  );

  const handleChatLauncherClick = useCallback(() => {
    scrollToSection("support");
  }, [scrollToSection]);

  return (
    <div className="app-shell">
      <main
        className="app-container"
        style={dynamicAccentStyles}
        data-selected-plan={selectedPlan?.id ?? "default"}
      >
        <section className="hero-card" id="overview">
          <div className="sync-banner">
            <span
              className={`sync-indicator${
                liveIntel.isSyncing ? " sync-indicator--pulse" : ""
              }`}
              aria-hidden
            />
            <span className="sync-text">
              Auto-syncing Grok-1 + DeepSeek-V2 feed
            </span>
            {countdown !== null && (
              <span className="sync-countdown" aria-live="polite">
                {liveIntel.isSyncing
                  ? "Updating…"
                  : `Next sync in ${countdown}s`}
              </span>
            )}
            <button
              type="button"
              className="button button-ghost sync-refresh"
              onClick={() => liveIntel.refresh()}
              disabled={liveIntel.isSyncing}
            >
              Refresh
            </button>
          </div>

          <div className="hero-header">
            <div>
              <p className="eyebrow">Dynamic Capital Desk</p>
              <h1 className="hero-title">
                Signal-driven growth with TON settlements.
              </h1>
              <p className="hero-subtitle">
                Seamlessly connect your TON wallet, auto-invest alongside our
                trading desk, and stay informed with every cycle.
              </p>
            </div>
            <div className="hero-metrics">
              {metrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-value">
                    {metric.value}
                    {metric.change && (
                      <span
                        className={`metric-change metric-change--${
                          metric.trend ?? "steady"
                        }`}
                      >
                        {metric.trend === "down"
                          ? "▼"
                          : metric.trend === "up"
                          ? "▲"
                          : "•"} {metric.change}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-actions">
            <TonConnectButton className="ton-button" />
            <button
              className="button button-secondary"
              onClick={linkWallet}
              disabled={isLinking || !wallet}
            >
              {isLinking ? "Linking…" : "Link wallet to desk"}
            </button>
          </div>

          {activePlanVisual.tagline && (
            <p className="hero-plan-tagline">{activePlanVisual.tagline}</p>
          )}

          <div className="hero-status">
            <div>
              <p className="status-label">Wallet</p>
              <p className="status-value">
                {formatWalletAddress(walletAddress)}
              </p>
            </div>
            <div>
              <p className="status-label">Telegram ID</p>
              <p className="status-value">{telegramId}</p>
            </div>
            <div>
              <p className="status-label">Plans</p>
              <p
                className={`status-value${
                  planSyncStatus.error ? " status-value--error" : ""
                }`}
              >
                {planSyncStatus.error
                  ? "Needs attention"
                  : planSyncStatus.isLoading
                  ? "Syncing…"
                  : planSyncStatus.isRealtimeSyncing
                  ? "Refreshing…"
                  : planSyncStatus.updatedAt
                  ? formatRelativeTime(planSyncStatus.updatedAt)
                  : "Live"}
              </p>
            </div>
            <div>
              <p className="status-label">Live feed</p>
              <p className="status-value">
                {liveIntel.isSyncing
                  ? "Syncing…"
                  : formatRelativeTime(liveIntel.updatedAt)}
              </p>
            </div>
            {selectedPlan && (
              <div>
                <p className="status-label">Selected plan</p>
                <p className="status-value">
                  {selectedPlan.name}
                  {selectedPlan.meta.amount !== null
                    ? ` • ${selectedPlan.price}`
                    : ""}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="section-card" id="plans">
          <div className="section-header">
            <div>
              <h2 className="section-title">Choose your runway</h2>
              <p className="section-description">
                Unlock the same tooling our desk uses daily. Each tier adds
                deeper access, more detailed reporting, and quicker capital
                cycling.
              </p>
            </div>
            {selectedPlan && (
              <div className="selected-plan-pill">{selectedPlan.cadence}</div>
            )}
          </div>

          <div className="plan-sync-row" role="status">
            <span
              className={`plan-sync-indicator${
                planSyncStatus.isLoading || planSyncStatus.isRealtimeSyncing
                  ? " plan-sync-indicator--pulse"
                  : ""
              }`}
              aria-hidden
            />
            <span className="plan-sync-text">
              {planSyncStatus.error
                ? "Live pricing offline – showing cached tiers"
                : planSyncStatus.isLoading
                ? "Syncing latest pricing…"
                : planSyncStatus.isRealtimeSyncing
                ? "Refreshing live pricing…"
                : planSyncStatus.updatedAt
                ? `Synced ${formatRelativeTime(planSyncStatus.updatedAt)}`
                : "Live pricing ready"}
            </span>
          </div>

          {planSyncStatus.error && (
            <div className="plan-sync-alert" role="alert">
              {planSyncStatus.error}
            </div>
          )}

          <div className="plan-grid">
            {planOptions.map((option) => {
              const isActive = option.id === plan;
              const visual = getPlanVisual(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`plan-card${isActive ? " plan-card--active" : ""}`}
                  onClick={() => setPlan(option.id)}
                  aria-pressed={isActive}
                  style={
                    {
                      "--plan-card-accent": visual.accent,
                      "--plan-card-soft": visual.soft,
                      "--plan-card-glow": visual.glow,
                      "--plan-card-sheen": visual.sheen,
                      "--plan-card-surface": visual.surface,
                      "--plan-card-shadow": visual.shadow,
                    } as CSSProperties
                  }
                >
                  <div className="plan-card-header">
                    <span className="plan-name">{option.name}</span>
                    <div className="plan-price-block">
                      <span className="plan-price">{option.price}</span>
                      {typeof option.meta.tonAmount === "number" &&
                        option.meta.tonAmount > 0 && (
                        <span className="plan-secondary-meta">
                          ≈ {option.meta.tonAmount.toFixed(2)} TON
                        </span>
                      )}
                      {typeof option.meta.dctAmount === "number" &&
                        option.meta.dctAmount > 0 && (
                        <span className="plan-secondary-meta">
                          ≈ {option.meta.dctAmount.toFixed(0)} DCT
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="plan-description">{option.description}</p>
                  <ul className="plan-highlights">
                    {option.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                  {visual.tagline && (
                    <span className="plan-tagline">{visual.tagline}</span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedPlan && (
            <aside
              className="plan-detail"
              aria-live="polite"
              style={{
                "--plan-detail-accent": activePlanVisual.accent,
                "--plan-detail-soft": activePlanVisual.soft,
                "--plan-detail-glow": activePlanVisual.glow,
              } as CSSProperties}
            >
              <header className="plan-detail__header">
                <span className="plan-detail__label">Currently selected</span>
                <div className="plan-detail__name">
                  {selectedPlan.name}
                  <span className="plan-detail__badge">{selectedPlan.cadence}</span>
                </div>
              </header>
              <div className="plan-detail__grid">
                <div>
                  <p className="plan-detail__metric-label">Desk contribution</p>
                  <p className="plan-detail__metric-value">{selectedPlan.price}</p>
                </div>
                {planTonLabel && (
                  <div>
                    <p className="plan-detail__metric-label">TON equivalent</p>
                    <p className="plan-detail__metric-value">{planTonLabel} TON</p>
                  </div>
                )}
                {planDctLabel && (
                  <div>
                    <p className="plan-detail__metric-label">Desk credit</p>
                    <p className="plan-detail__metric-value">{planDctLabel} DCT</p>
                  </div>
                )}
              </div>
              {planUpdatedLabel && (
                <p className="plan-detail__footnote">Last repriced {planUpdatedLabel}</p>
              )}
            </aside>
          )}

          {planSnapshot && planSnapshotCurrency && (
            <PlanSnapshotCard
              snapshot={planSnapshot}
              currency={planSnapshotCurrency}
            />
          )}

          <div className="plan-actions">
            <button
              className="button button-primary"
              onClick={startSubscription}
              disabled={isProcessing}
            >
              {isProcessing ? "Submitting…" : "Start auto-invest"}
            </button>
            {txHash && (
              <p className="plan-hash">Latest transaction request: {txHash}</p>
            )}
          </div>
        </section>

        <section className="section-card" id="minting">
          <div className="section-header">
            <div>
              <h2 className="section-title">Theme minting</h2>
              <p className="section-description">
                Launch each Theme Pass drop with a single tap. Every run is logged
                to the treasury ledger so governance can audit who triggered the
                mint and when.
              </p>
            </div>
          </div>

          <div className="mint-grid">
            {THEME_MINT_PLANS.map((mintPlan) => {
              const state = mintingStates[mintPlan.index] ?? {
                status: "idle",
                progress: 0,
              };
              const isStarting = state.status === "starting";
              const isComplete = state.status === "success";
              const progressValue = Math.min(
                100,
                Math.max(0, Math.round(state.progress)),
              );
              const statusLabel = (() => {
                switch (state.status) {
                  case "starting":
                    return "Coordinating";
                  case "success":
                    return "Mint scheduled";
                  case "error":
                    return "Failed";
                  default:
                    return "Ready";
                }
              })();
              const helperText = (() => {
                switch (state.status) {
                  case "starting":
                    return progressValue >= 95
                      ? "Awaiting treasury confirmation…"
                      : `Coordinating validators • ${progressValue}%`;
                  case "success":
                    return state.startedAt
                      ? `Started ${formatRelativeTime(state.startedAt)}`
                      : "Mint run started.";
                  case "error":
                    return state.error ?? "Mint run could not start. Try again.";
                  default:
                    return "Tap start to dispatch this theme run.";
                }
              })();
              const messageRole = state.status === "error"
                ? "alert"
                : state.status === "starting" || state.status === "success"
                ? "status"
                : undefined;
              const progressAriaText = (() => {
                switch (state.status) {
                  case "starting":
                    return `Mint progress ${progressValue}%`;
                  case "success":
                    return "Mint scheduled";
                  case "error":
                    return "Mint failed";
                  default:
                    return undefined;
                }
              })();
              const cardClassName = `mint-card${
                state.status !== "idle" ? ` mint-card--${state.status}` : ""
              }`;

              return (
                <article
                  key={mintPlan.index}
                  className={cardClassName}
                  style={{
                    "--mint-accent": mintPlan.accent,
                    "--mint-accent-soft": mintPlan.accentSoft,
                    "--mint-glow": mintPlan.glow,
                  } as CSSProperties}
                >
                  <header className="mint-card__header">
                    <div>
                      <p className="mint-card__eyebrow">Mint #{mintPlan.index}</p>
                      <h3 className="mint-card__title">{mintPlan.name}</h3>
                    </div>
                    <span className="mint-card__priority" aria-label="Default priority">
                      Priority {mintPlan.defaultPriority}
                    </span>
                  </header>

                  <div className="mint-card__tags">
                    <span className="mint-card__tag">{mintPlan.launchWindow}</span>
                    <span className="mint-card__tag mint-card__tag--outline">
                      {mintPlan.supply}
                    </span>
                  </div>

                  <p className="mint-card__description">{mintPlan.description}</p>

                  <div
                    className="mint-card__progress"
                    data-status={state.status}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressValue}
                    aria-valuetext={progressAriaText ?? undefined}
                  >
                    <div className="mint-card__progress-track">
                      <div
                        className="mint-card__progress-bar"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                    <div className="mint-card__progress-footer">
                      <span className="mint-card__progress-state">{statusLabel}</span>
                      {state.status !== "idle" && (
                        <span className="mint-card__progress-value">
                          {progressValue}%
                        </span>
                      )}
                    </div>
                  </div>

                  <dl className="mint-card__meta">
                    <div>
                      <dt>Launch window</dt>
                      <dd>{mintPlan.launchWindow}</dd>
                    </div>
                    <div>
                      <dt>Supply</dt>
                      <dd>{mintPlan.supply}</dd>
                    </div>
                    <div>
                      <dt>Content URI</dt>
                      <dd>{mintPlan.contentUri}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span className={`mint-card__status mint-card__status--${state.status}`}>
                          {statusLabel}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  {helperText && (
                    <p
                      className={`mint-card__message${
                        state.status === "error" ? " mint-card__message--error" : ""
                      }`}
                      role={messageRole}
                      aria-live={messageRole ? "polite" : undefined}
                    >
                      {helperText}
                    </p>
                  )}

                  <button
                    type="button"
                    className="button button-secondary mint-card__action"
                    onClick={() => startThemeMint(mintPlan)}
                    disabled={isStarting || isComplete}
                  >
                    {isStarting
                      ? "Starting…"
                      : isComplete
                      ? "Mint scheduled"
                      : state.status === "error"
                      ? "Retry mint"
                      : "Start minting"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <LiveIntelligenceSection
          intel={liveIntel.report}
          status={liveIntel.status}
          isSyncing={liveIntel.isSyncing}
          updatedAt={liveIntel.updatedAt}
          countdown={countdown}
          error={liveIntel.error}
          onRefresh={liveIntel.refresh}
        />

        <section className="section-card" id="activity">
          <h2 className="section-title">Desk timeline</h2>
          <ul className="activity-list">
            {timeline.map((item) => (
              <li
                key={`${item.title}-${item.timestamp}`}
                className={`activity-item activity-item--${item.status}`}
              >
                <div className="activity-marker" aria-hidden />
                <div>
                  <div className="activity-header">
                    <span className="activity-title">{item.title}</span>
                    <span className="activity-timestamp">{item.timestamp}</span>
                  </div>
                  <p className="activity-description">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="section-card" id="appearance">
          <div className="section-header">
            <div>
              <h2 className="section-title">Appearance</h2>
              <p className="section-description">
                Personalise the desk with partner palettes unlocked by your
                Theme NFTs.
              </p>
            </div>
            {isThemeBusy && (
              <span
                className="theme-sync-pill"
                role="status"
                aria-live="polite"
              >
                Syncing…
              </span>
            )}
          </div>

          {themeState.error && (
            <div className="plan-sync-alert" role="alert">
              {themeState.error}
            </div>
          )}

          {themeStatusMessage && (
            <p className="theme-status" role="status" aria-live="polite">
              {themeStatusMessage}
            </p>
          )}

          <div className="theme-grid" role="list">
            {themeOptions.map((theme) => {
              const isActive = themeState.activeThemeId === theme.id;
              const swatches = resolveThemeSwatches(theme);
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="listitem"
                  className={`theme-option${
                    isActive ? " theme-option--active" : ""
                  }`}
                  onClick={() => {
                    if (!isActive) {
                      handleThemeSelect(theme);
                    }
                  }}
                  disabled={isThemeBusy && !isActive}
                  aria-pressed={isActive}
                >
                  <div className="theme-option__preview" aria-hidden>
                    {theme.previewImage
                      ? <img src={theme.previewImage} alt="" loading="lazy" />
                      : (
                        swatches.map((color, index) => (
                          <span
                            key={`${theme.id}-swatch-${index}`}
                            style={{ background: color }}
                          />
                        ))
                      )}
                  </div>
                  <div className="theme-option__meta">
                    <div className="theme-option__headline">
                      <span className="theme-option__name">{theme.label}</span>
                      {isActive && (
                        <span className="theme-option__badge">Active</span>
                      )}
                    </div>
                    {theme.description && (
                      <p className="theme-option__description">
                        {theme.description}
                      </p>
                    )}
                    {theme.updatedAt && (
                      <span className="theme-option__updated">
                        Updated {formatRelativeTime(theme.updatedAt)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {!themeOptions.length && (
              <div className="theme-empty" role="listitem">
                <p>{themeEmptyCopy}</p>
              </div>
            )}
          </div>

          <div className="theme-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={handleThemeReset}
              disabled={!themeState.activeThemeId || isThemeBusy}
            >
              Use default palette
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={handleThemeRefresh}
              disabled={themeState.isLoading}
            >
              Refresh themes
            </button>
          </div>
        </section>

        <section className="section-card" id="support">
          <h2 className="section-title">What you unlock</h2>
          <div className="feature-grid">
            {OVERVIEW_FEATURES.map((feature) => (
              <article key={feature.title} className="feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>

          <div className="support-grid">
            {SUPPORT_OPTIONS.map((option) => (
              <div key={option.title} className="support-card">
                <div>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </div>
                <button className="button button-ghost">{option.action}</button>
              </div>
            ))}
          </div>
        </section>

        {statusMessage && <div className="status-banner">{statusMessage}</div>}
      </main>

      <ChatLauncher
        compact={isChatCompact}
        onOpen={handleChatLauncherClick}
      />

      <nav aria-label="Mini app sections" className="bottom-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              aria-current={isActive ? "page" : undefined}
              className={`nav-button${isActive ? " nav-button--active" : ""}`}
            >
              <Icon active={isActive} />
              <span className="nav-button__label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

type ChatLauncherProps = {
  compact: boolean;
  onOpen: () => void;
};

function ChatLauncher({ compact, onOpen }: ChatLauncherProps) {
  return (
    <div className={`chat-launcher${compact ? " chat-launcher--compact" : ""}`}>
      <button
        type="button"
        className="chat-launcher__button"
        onClick={onOpen}
        aria-label="Write to start up"
        title="Write to start up"
      >
        <span className="chat-launcher__icon" aria-hidden>
          <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
            <path
              d="M4.25 4.5h15.5a1.75 1.75 0 0 1 1.75 1.75v8.5a1.75 1.75 0 0 1-1.75 1.75H13l-3.9 3.4a.75.75 0 0 1-1.25-.56V16.5H4.25A1.75 1.75 0 0 1 2.5 14.75v-8.5A1.75 1.75 0 0 1 4.25 4.5Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <span className="chat-launcher__text" aria-hidden={compact}>
          <span className="chat-launcher__title">Write to start up</span>
          <span className="chat-launcher__subtitle">
            Chat with desk concierge
          </span>
        </span>
      </button>
    </div>
  );
}

function LiveIntelligenceSection({
  intel,
  status,
  isSyncing,
  updatedAt,
  countdown,
  error,
  onRefresh,
}: {
  intel?: LiveIntelSnapshot;
  status: LiveIntelState["status"];
  isSyncing: boolean;
  updatedAt?: string;
  countdown: number | null;
  error?: string;
  onRefresh: () => void;
}) {
  const confidenceLabel = formatConfidence(intel?.confidence);
  const alerts = intel?.alerts ?? [];
  const opportunities = intel?.opportunities ?? [];
  const risks = intel?.risks ?? [];
  const hasIntel = Boolean(intel);

  return (
    <section className="section-card" id="intel">
      <div className="section-header">
        <div>
          <h2 className="section-title">Live desk intelligence</h2>
          <p className="section-description">
            Grok-1 strategy briefs are auto-synced with DeepSeek-V2 risk
            arbitration so every decision stays in lockstep with the desk.
          </p>
        </div>
        <div className="selected-plan-pill">
          {isSyncing
            ? "Syncing…"
            : countdown !== null
            ? `Next sync in ${countdown}s`
            : updatedAt
            ? `Updated ${formatRelativeTime(updatedAt)}`
            : "Awaiting sync"}
        </div>
      </div>

      {error && status === "error" && (
        <div className="status-banner status-banner--error">
          Unable to reach the intelligence feed right now. We'll retry
          automatically.
          <button
            type="button"
            className="button button-ghost"
            onClick={onRefresh}
          >
            Retry now
          </button>
        </div>
      )}

      <div className="intel-grid">
        <div className="intel-card intel-card--primary">
          <div className="intel-meta">
            <span className="intel-updated">
              {isSyncing
                ? "Streaming Grok-1 update…"
                : updatedAt
                ? `Last sync ${formatRelativeTime(updatedAt)}`
                : "Waiting for first sync"}
            </span>
            {confidenceLabel && (
              <span className="confidence-chip">{confidenceLabel}</span>
            )}
          </div>
          {hasIntel
            ? (
              <>
                <p className="intel-narrative">{intel?.narrative}</p>
                {alerts.length > 0
                  ? (
                    <ul className="alert-list">
                      {alerts.map((alert) => (
                        <li key={alert} className="alert-pill">
                          <span aria-hidden>⚠️</span>
                          {alert}
                        </li>
                      ))}
                    </ul>
                  )
                  : (
                    <p className="intel-muted">
                      No blocking alerts flagged by DeepSeek-V2 sentinel.
                    </p>
                  )}
              </>
            )
            : (
              <div className="skeleton-group">
                <div className="skeleton skeleton--text skeleton--wide" />
                <div className="skeleton skeleton--text skeleton--wide" />
                <div className="skeleton skeleton--text skeleton--medium" />
              </div>
            )}
        </div>

        <div className="intel-card">
          <h3>Opportunities</h3>
          {hasIntel
            ? (
              <ul className="intel-list">
                {opportunities.map((item) => (
                  <li key={item}>
                    <span
                      className="intel-bullet intel-bullet--opportunity"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )
            : <IntelListSkeleton />}
        </div>

        <div className="intel-card">
          <h3>Risks</h3>
          {hasIntel
            ? (
              <ul className="intel-list">
                {risks.map((item) => (
                  <li key={item}>
                    <span
                      className="intel-bullet intel-bullet--risk"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )
            : <IntelListSkeleton />}
        </div>
      </div>

      {intel ? <ModelBreakdown intel={intel} /> : (
        <div className="model-grid">
          <div className="model-card">
            <div className="skeleton skeleton--text skeleton--medium" />
            <div className="skeleton skeleton--block" />
            <div className="skeleton skeleton--text skeleton--medium" />
          </div>
          <div className="model-card">
            <div className="skeleton skeleton--text skeleton--medium" />
            <div className="skeleton skeleton--block" />
            <div className="skeleton skeleton--text skeleton--medium" />
          </div>
        </div>
      )}

      {error && status !== "error" && (
        <div className="status-banner status-banner--error">
          Brief network hiccup detected. Showing the last Grok-1 + DeepSeek-V2
          sync while we refresh in the background.
        </div>
      )}
    </section>
  );
}

function IntelListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-group">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`intel-skeleton-${index}`}
          className="skeleton skeleton--text skeleton--wide"
        />
      ))}
    </div>
  );
}

function SnapshotMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="plan-snapshot__metric">
      <span className="plan-snapshot__metric-label">{label}</span>
      <span
        className={`plan-snapshot__metric-value${
          tone ? ` plan-snapshot__metric-value--${tone}` : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PlanSnapshotCard({
  snapshot,
  currency,
}: {
  snapshot: NormalizedPlanSnapshot;
  currency: string;
}) {
  const baseLabel = snapshot.basePrice !== null
    ? formatCurrencyAmount(
      currency,
      snapshot.basePrice,
      snapshot.basePrice % 1 === 0 ? 0 : 2,
    )
    : null;
  const dynamicLabel = snapshot.dynamicPrice !== null
    ? formatCurrencyAmount(
      currency,
      snapshot.dynamicPrice,
      snapshot.dynamicPrice % 1 === 0 ? 0 : 2,
    )
    : null;
  const displayLabel = snapshot.displayPrice !== null
    ? formatCurrencyAmount(
      currency,
      snapshot.displayPrice,
      snapshot.displayPrice % 1 === 0 ? 0 : 2,
    )
    : null;
  const tonRateLabel = snapshot.tonRate !== null
    ? formatCurrencyAmount(
      "USD",
      snapshot.tonRate,
      snapshot.tonRate % 1 === 0 ? 0 : 2,
    )
    : null;
  const deltaLabel = formatPercent(snapshot.deltaPercent);
  const computedLabel = snapshot.computedAt
    ? formatRelativeTime(snapshot.computedAt)
    : null;
  const adjustments = snapshot.adjustments.slice(0, 4);

  return (
    <section className="plan-snapshot" aria-label="Live pricing snapshot">
      <div className="plan-snapshot__header">
        <h3 className="plan-snapshot__title">Live pricing snapshot</h3>
        {computedLabel && (
          <span className="plan-snapshot__timestamp">Updated {computedLabel}</span>
        )}
      </div>
      <div className="plan-snapshot__grid">
        {displayLabel && (
          <SnapshotMetric label="Display price" value={displayLabel} />
        )}
        {dynamicLabel && (
          <SnapshotMetric label="Dynamic price" value={dynamicLabel} />
        )}
        {baseLabel && <SnapshotMetric label="Baseline" value={baseLabel} />}
        {deltaLabel && (
          <SnapshotMetric
            label="Δ vs previous"
            value={deltaLabel}
            tone={snapshot.deltaPercent && snapshot.deltaPercent < 0
              ? "negative"
              : "positive"}
          />
        )}
        {tonRateLabel && (
          <SnapshotMetric
            label="TON/USD feed"
            value={`${tonRateLabel} / TON`}
          />
        )}
      </div>
      {adjustments.length > 0 && (
        <div className="plan-snapshot__adjustments">
          <span className="plan-snapshot__adjustments-label">
            Adjustment mix
          </span>
          <ul className="plan-snapshot__adjustments-list">
            {adjustments.map((item) => {
              const percentLabel = formatPercent(item.value * 100, 1);
              const tone = item.value < 0 ? "negative" : "positive";
              return (
                <li key={item.key} className="plan-snapshot__adjustment">
                  <span className="plan-snapshot__adjustment-name">
                    {formatAdjustmentLabel(item.key)}
                  </span>
                  {percentLabel && (
                    <span
                      className={`plan-snapshot__adjustment-value plan-snapshot__adjustment-value--${tone}`}
                    >
                      {percentLabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function ModelBreakdown({ intel }: { intel: LiveIntelSnapshot }) {
  const grok = intel.models.grok;
  const deepseek = intel.models.deepseek;
  const riskScore = typeof deepseek.riskScore === "number"
    ? Math.min(Math.max(deepseek.riskScore, 0), 1)
    : null;
  const riskLevel = riskSeverity(riskScore ?? undefined);
  const riskLabel = riskScore === null
    ? "Risk scan"
    : `${Math.round(riskScore * 100)}% risk`;

  return (
    <div className="model-grid">
      <div className="model-card">
        <div className="model-header">
          <span className="model-name">Grok-1 strategist</span>
          <span className="model-tag">{grok.focus}</span>
        </div>
        <p className="model-summary">{grok.summary}</p>
        <ul className="model-highlights">
          {grok.highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div className="model-card">
        <div className="model-header">
          <span className="model-name">DeepSeek-V2 sentinel</span>
          <span className={`model-risk model-risk--${riskLevel}`}>
            {riskLabel}
          </span>
        </div>
        <p className="model-summary">{deepseek.summary}</p>
        <ul className="model-highlights">
          {deepseek.highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`nav-icon${active ? " nav-icon--active" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`nav-icon${active ? " nav-icon--active" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M12 2.5 13.6 8h5.4l-4.3 3.2L16.3 17 12 13.9 7.7 17l1.3-5.8L4.7 8h5.4z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RadarIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`nav-icon${active ? " nav-icon--active" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active ? 1 : 0.8}
      />
      <path
        d="M12 4v4m0 4 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.2"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`nav-icon${active ? " nav-icon--active" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M4 13.5 8 9l3.5 5L14 6l2.5 8.5L20 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.8}
      />
    </svg>
  );
}

function MintIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`nav-icon${active ? " nav-icon--active" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M12 3.5c-.4 2-2.5 4.5-3.7 6.3-1.1 1.7-1.8 3-1.8 4.7a5.5 5.5 0 0 0 11 0c0-1.7-.7-3-1.8-4.7-1.2-1.8-3.3-4.3-3.7-6.3Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="15"
        r="1.8"
        fill={active ? "#0f172a" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function PaletteIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`nav-icon${active ? " nav-icon--active" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M12 3a9 9 0 1 0 0 18c1.6 0 2.6-.92 2.6-2.06 0-1.27-.96-2-2.14-2.3-.94-.25-1.43-.86-1.43-1.62 0-.92.74-1.7 1.7-1.7h1.75c1.43 0 2.52-1.09 2.52-2.52A7 7 0 0 0 12 3Zm-4.4 8a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm2.7-3.9a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm5.4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm1.6 3.9a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LifebuoyIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`nav-icon${active ? " nav-icon--active" : ""}`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active ? 1 : 0.8}
      />
      <circle
        cx="12"
        cy="12"
        r="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.7 5.7 8.4 8.4M18.3 5.7l-2.7 2.7m2.7 11.6-2.7-2.7M5.7 18.3l2.7-2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "plans", label: "Plans", icon: SparkIcon },
  { id: "minting", label: "Minting", icon: MintIcon },
  { id: "intel", label: "Live intel", icon: RadarIcon },
  { id: "activity", label: "Timeline", icon: ActivityIcon },
  { id: "appearance", label: "Themes", icon: PaletteIcon },
  { id: "support", label: "Support", icon: LifebuoyIcon },
];

export default function Page() {
  const { manifestUrl, resolving, error, retry } = useTonConnectManifestUrl();

  if (resolving && !manifestUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white">
        <span className="animate-pulse">Resolving TON Connect manifest…</span>
      </div>
    );
  }

  if (!manifestUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-sm text-white">
        <div className="space-y-6">
          <p>{TON_MANIFEST_FATAL_MESSAGE}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const manifestUrlForProvider = manifestUrl ?? TON_MANIFEST_FALLBACK_DATA_URL;

  return (
    <>
      {error ? (
        <TonManifestFallbackBanner message={error} onRetry={retry} />
      ) : null}
      <TonConnectUIProvider
        manifestUrl={manifestUrlForProvider}
        walletsListConfiguration={TONCONNECT_WALLETS_LIST_CONFIGURATION}
        actionsConfiguration={TONCONNECT_ACTIONS_CONFIGURATION}
      >
        <HomeInner />
      </TonConnectUIProvider>
    </>
  );
}

function TonManifestFallbackBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-3xl bg-white/10 px-4 py-3 text-left text-xs text-white shadow-lg backdrop-blur">
        <div className="space-y-1">
          <p className="font-medium">{message}</p>
          <p className="text-white/70">
            We’ll keep trying in the background. You can also manually retry now.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
