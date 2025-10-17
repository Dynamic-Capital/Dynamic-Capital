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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, JSX } from "react";
import {
  Badge,
  Banner,
  BarChart,
  Button,
  Card,
  Column,
  Grid,
  Heading,
  List,
  Row,
  Skeleton,
  StatusIndicator,
  Text,
  useToast,
  type Colors,
} from "@once-ui-system/core";
import { useMiniAppThemeManager } from "@shared/miniapp/use-miniapp-theme";
import { TONCONNECT_WALLETS_LIST_CONFIGURATION } from "@shared/ton/tonconnect-wallets";
import type {
  MiniAppThemeOption,
  TonConnectLike,
} from "@shared/miniapp/theme-loader";
import {
  deriveTonTransactionHash,
  isSupportedPlan,
  linkTonMiniAppWallet,
  type Plan,
  processTonMiniAppSubscription,
  requestTonProofChallenge,
  type TonProofChallenge,
  type TonProofPayload,
} from "@/lib/ton-miniapp-helper";
import {
  computeTonProofRefreshDelay,
  deriveTonProofUiState,
  type TonProofState,
} from "@/lib/ton-proof-state";

import type {
  LiveIntelSnapshot,
  LiveMetric,
  LiveTimelineEntry,
} from "@/data/live-intel";
import { DEFAULT_REFRESH_SECONDS } from "@/data/live-intel";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  DYNAMIC_TON_API_USER_ID,
  OPS_TREASURY_ADDRESS,
  TONCONNECT_TWA_RETURN_URL,
} from "@/lib/config";
import { THEME_MINT_PLANS, type ThemeMintPlan } from "@/data/theme-mints";
import {
  TON_MANIFEST_RESOURCE_PATH,
  TON_MANIFEST_URL_CANDIDATES,
} from "@shared/ton/manifest";
import { TON_MANIFEST_FALLBACK_DATA_URL } from "@/lib/ton-manifest-inline";
import { resolveTonManifestUrl } from "@/lib/ton-manifest-resolver";
import {
  ChatLauncher,
  HeroSection,
  MintingGrid,
  PlanSelection,
  SectionNavigation,
  TimelineView,
  type PlanVisual,
} from "@/components/miniapp";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiBookOpen,
  FiLayers,
  FiMessageCircle,
  FiShield,
  FiZap,
} from "react-icons/fi";

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

type SnapshotAdjustment = {
  key: string;
  value: number;
};

type NormalizedPlanSnapshot = {
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
    snapshot: NormalizedPlanSnapshot | null;
    snapshotSignature: string | null;
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

type OverviewFeature = {
  title: string;
  description: string;
  icon: IconType;
};

type SupportOption = {
  title: string;
  description: string;
  action: string;
  icon: IconType;
};

type StatusTone = "info" | "success" | "danger";

type StatusNotice = {
  message: string;
  tone: StatusTone;
};

const STATUS_BANNER_TONES: Record<StatusTone, { solid: Colors; onSolid: Colors }> = {
  info: { solid: "info-medium", onSolid: "info-strong" },
  success: { solid: "success-medium", onSolid: "success-strong" },
  danger: { solid: "danger-medium", onSolid: "danger-strong" },
};

type NavItem = {
  id: SectionId;
  label: string;
  icon: (props: { active: boolean; className?: string }) => JSX.Element;
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

const FALLBACK_PLAN_LOOKUP: Record<Plan, PlanOption> = Object.fromEntries(
  FALLBACK_PLAN_OPTIONS.map((option) => [option.id, option]),
) as Record<Plan, PlanOption>;

type PlanAccentScheme = "accent" | "brand" | "info" | "success" | "warning" | "danger";

function createPlanVisual(scheme: PlanAccentScheme, tagline: string): PlanVisual {
  const base = `var(--${scheme}`;
  return {
    accent: `${base}-solid-medium)`,
    accentStrong: `${base}-solid-strong)`,
    soft: `${base}-background-weak)`,
    glow: `${base}-alpha-medium)`,
    sheen: `${base}-alpha-weak)`,
    surface: `${base}-background-strong)`,
    shadow: `${base}-alpha-medium)`,
    tagline,
  };
}

const PLAN_VISUALS: Record<Plan | "default", PlanVisual> = {
  default: createPlanVisual("accent", "Desk-aligned signal tier"),
  vip_bronze: createPlanVisual("warning", "Momentum-aligned entries from the desk core"),
  vip_silver: createPlanVisual("info", "Leverage-managed mid-cycle rotations"),
  vip_gold: createPlanVisual("success", "Structured products and vault orchestration"),
  mentorship: createPlanVisual("brand", "Direct mentorship with senior PM alignment"),
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
      .filter((item): item is SnapshotAdjustment =>
        typeof item.value === "number"
      )
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    : [];

  const computedAtCandidate = record.computed_at ?? record.computedAt;
  const computedAt = typeof computedAtCandidate === "string" &&
      computedAtCandidate.trim().length > 0
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
    const snapshotSignature = serialiseSnapshot(snapshot);
    const normalizedSnapshot = resolvePlanSnapshot(
      snapshot,
      snapshotSignature,
    );
    const tonAmount = coerceNumber(raw.ton_amount) ??
      normalizedSnapshot?.tonAmount ??
      fallback.meta.tonAmount ?? null;
    const dctAmount = coerceNumber(raw.dct_amount) ??
      normalizedSnapshot?.dctAmount ?? null;
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

function formatPercent(
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

function formatAdjustmentLabel(key: string): string {
  if (!key) {
    return "Adjustment";
  }
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function serialiseSnapshot(
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

function resolvePlanSnapshot(
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
    if (
      !planSnapshotCache.has(signature) &&
      planSnapshotCache.size >= PLAN_SNAPSHOT_CACHE_LIMIT
    ) {
      const oldestKey = planSnapshotCache.keys().next().value;
      if (typeof oldestKey === "string") {
        planSnapshotCache.delete(oldestKey);
      }
    }
    planSnapshotCache.set(signature, normalized);
  }

  return normalized;
}

function areNormalizedSnapshotsEqual(
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
    const parsed = parseIsoTimestamp(timestamp);
    if (parsed === null) continue;
    if (parsed > latestTimestamp) {
      latestTimestamp = parsed;
    }
  }

  if (
    !Number.isFinite(latestTimestamp) ||
    latestTimestamp === Number.NEGATIVE_INFINITY
  ) {
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

const ISO_TIMESTAMP_CACHE_LIMIT = 128;
const isoTimestampCache = new Map<string, number | null>();

function parseIsoTimestamp(iso?: string | null): number | null {
  if (!iso) {
    return null;
  }

  if (isoTimestampCache.has(iso)) {
    return isoTimestampCache.get(iso) ?? null;
  }

  const parsed = Date.parse(iso);
  const normalized = Number.isFinite(parsed) ? parsed : null;
  if (
    !isoTimestampCache.has(iso) &&
    isoTimestampCache.size >= ISO_TIMESTAMP_CACHE_LIMIT
  ) {
    const oldestKey = isoTimestampCache.keys().next().value;
    if (typeof oldestKey === "string") {
      isoTimestampCache.delete(oldestKey);
    }
  }
  isoTimestampCache.set(iso, normalized);
  return normalized;
}

function formatRelativeTime(iso?: string): string {
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

  const divisions: Array<
    { amount: number; unit: Intl.RelativeTimeFormatUnit }
  > = [
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

const OVERVIEW_FEATURES: OverviewFeature[] = [
  {
    title: "Live Signal Desk",
    description:
      "High-conviction execution with 24/7 desk monitoring across majors, TON ecosystem, and DeFi rotations.",
    icon: FiZap,
  },
  {
    title: "Auto-Invest Vaults",
    description:
      "Deploy into curated baskets that rebalance automatically with transparent on-chain attestations.",
    icon: FiLayers,
  },
  {
    title: "Risk Controls",
    description:
      "Dynamic guardrails, circuit breakers, and managed drawdown ceilings purpose-built for active traders.",
    icon: FiShield,
  },
];

const FEATURE_ACCENTS = ["cyan", "emerald", "magenta"] as const;

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
    icon: FiMessageCircle,
  },
  {
    title: "Trading playbook",
    description:
      "Step-by-step frameworks and risk tooling to mirror the Dynamic Capital approach.",
    action: "View docs",
    icon: FiBookOpen,
  },
  {
    title: "Status center",
    description:
      "Check live uptime for deposits, OCR, and auto-invest execution engines.",
    action: "Launch status page",
    icon: FiActivity,
  },
];

const SUPPORT_ACCENTS = ["magenta", "cyan", "emerald"] as const;

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
  const { addToast } = useToast();
  const [statusNotice, setStatusNotice] = useState<StatusNotice | null>(null);
  const statusBannerTone = statusNotice
    ? STATUS_BANNER_TONES[statusNotice.tone]
    : null;
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [isLinking, setIsLinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mintingStates, setMintingStates] = useState<
    Record<number, MintingPlanState>
  >(
    createDefaultMintingState,
  );
  const [tonProofChallenge, setTonProofChallenge] = useState<
    TonProofChallenge | null
  >(null);
  const [tonProofState, setTonProofState] = useState<TonProofState>({
    status: "idle",
  });
  const [tonProof, setTonProof] = useState<TonProofPayload | null>(null);
  const [walletVerified, setWalletVerified] = useState(false);
  const telegramId = useTelegramId();
  const liveIntel = useLiveIntel();
  const [countdown, setCountdown] = useState<number | null>(null);
  const isChatCompact = useCompactChatLauncher();
  const { manager: themeManager, state: themeState } = useMiniAppThemeManager(
    tonConnectThemeSource,
  );
  const mintingProgressTimers = useRef<Record<number, number>>({});
  const tonProofRequestInFlight = useRef(false);
  const lastChallengeTelegramIdRef = useRef<string | null>(null);

  const showStatus = useCallback(
    (message: string | null, tone: StatusTone = "info", options?: {
      toast?: boolean;
    }) => {
      if (!message) {
        setStatusNotice(null);
        return;
      }

      setStatusNotice({ message, tone });

      const shouldToast = options?.toast ?? tone !== "info";
      if (shouldToast) {
        addToast({
          message,
          variant: tone === "danger" ? "danger" : "success",
        });
      }
    },
    [addToast],
  );

  const updatePlanSyncStatus = useCallback(
    (updater: (previous: PlanSyncStatus) => PlanSyncStatus) => {
      setPlanSyncStatus((previous) => {
        const next = updater(previous);
        return arePlanSyncStatusesEqual(previous, next) ? previous : next;
      });
    },
    [],
  );

  const refreshTonProofChallenge = useCallback(async () => {
    if (!tonConnectUI || !telegramId || tonProofRequestInFlight.current) {
      return;
    }
    tonProofRequestInFlight.current = true;
    setWalletVerified(false);
    setTonProof(null);
    try {
      tonConnectUI.setConnectRequestParameters?.({ state: "loading" });
      setTonProofState({ status: "loading" });
      const result = await requestTonProofChallenge({ telegramId });
      if (!result.ok) {
        setTonProofState({ status: "error", error: result.error });
        tonConnectUI.setConnectRequestParameters?.(null);
        return;
      }
      setTonProofChallenge(result.challenge);
      setTonProofState({ status: "ready" });
      lastChallengeTelegramIdRef.current = telegramId;
      tonConnectUI.setConnectRequestParameters?.({
        state: "ready",
        value: { tonProof: result.challenge.payload },
      });
    } catch (error) {
      console.error("[miniapp] Failed to request TON proof challenge", error);
      setTonProofState({
        status: "error",
        error: "Unable to prepare TON wallet verification. Retry shortly.",
      });
      tonConnectUI.setConnectRequestParameters?.(null);
    } finally {
      tonProofRequestInFlight.current = false;
    }
  }, [telegramId, tonConnectUI]);

  useEffect(() => {
    if (!tonConnectUI || !telegramId) {
      return;
    }
    if (lastChallengeTelegramIdRef.current === telegramId) {
      return;
    }
    void refreshTonProofChallenge();
  }, [tonConnectUI, telegramId, refreshTonProofChallenge]);

  useEffect(() => {
    if (!tonProofChallenge) {
      return;
    }

    const delay = computeTonProofRefreshDelay({
      expiresAt: tonProofChallenge.expires_at,
      now: Date.now(),
      walletVerified,
    });

    if (delay === null) {
      return;
    }

    if (delay <= 0) {
      void refreshTonProofChallenge();
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshTonProofChallenge();
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [tonProofChallenge, walletVerified, refreshTonProofChallenge]);

  useEffect(() => {
    if (!tonConnectUI) {
      setTonProof(null);
      setWalletVerified(false);
      setTonProofState({ status: "idle" });
      tonProofRequestInFlight.current = false;
      return;
    }
    const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
      if (
        walletInfo?.connectItems?.tonProof &&
        "proof" in walletInfo.connectItems.tonProof
      ) {
        setTonProof(walletInfo.connectItems.tonProof.proof);
        setTonProofState((previous) => {
          if (previous.status === "verified") {
            return previous;
          }
          if (previous.status === "ready") {
            return previous;
          }
          return { status: "ready" };
        });
      } else {
        setTonProof(null);
      }
      if (!walletInfo) {
        setWalletVerified(false);
        setTonProofState({ status: "idle" });
        setTonProofChallenge(null);
        lastChallengeTelegramIdRef.current = null;
        tonProofRequestInFlight.current = false;
        tonConnectUI.setConnectRequestParameters?.(null);
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, [tonConnectUI]);

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
  const planSnapshot = useMemo(
    () => selectedPlan?.meta.snapshot ?? null,
    [selectedPlan?.meta.snapshot],
  );
  const planSnapshotCurrency = useMemo(
    () => selectedPlan?.meta.currency ?? null,
    [selectedPlan?.meta.currency],
  );
  const wallet = tonConnectUI?.account;
  const walletAddress = wallet?.address;

  const themeOptions = themeState.availableThemes;
  const walletConnected = Boolean(walletAddress);
  const tonProofUi = useMemo(
    () =>
      deriveTonProofUiState({
        state: tonProofState,
        hasWallet: walletConnected,
        hasProof: Boolean(tonProof),
        walletVerified,
      }),
    [tonProofState, walletConnected, tonProof, walletVerified],
  );
  const handleTonProofRetry = useCallback(() => {
    void refreshTonProofChallenge();
  }, [refreshTonProofChallenge]);
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
              ? String(
                (payload as { error?: unknown }).error ?? "Mint start failed",
              )
              : `Mint start failed (HTTP ${response.status})`;
          throw new Error(errorMessage);
        }

        const mintRecord =
          typeof payload === "object" && payload && "mint" in payload
            ? (payload as { mint?: { started_at?: string | null } }).mint ??
              null
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
        const message = error instanceof Error
          ? error.message
          : "Unable to reach the minting service. Please try again shortly.";
        clearMintingTimer(plan.index);
        setMintingStates((previous) => {
          const current = previous[plan.index];
          const fallbackProgress = current && current.status === "starting"
            ? current.progress
            : 0;
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
  const heroPlanStatusText = planSyncStatus.error
    ? "Needs attention"
    : planSyncStatus.isLoading
    ? "Syncing…"
    : planSyncStatus.isRealtimeSyncing
    ? "Refreshing…"
    : planSyncStatus.updatedAt
    ? formatRelativeTime(planSyncStatus.updatedAt)
    : "Live";
  const heroSelectedPlanSummary = selectedPlan
    ? {
      name: selectedPlan.name,
      price: selectedPlan.meta.amount !== null ? selectedPlan.price : undefined,
      cadence: selectedPlan.cadence,
      amountAvailable: selectedPlan.meta.amount !== null,
    }
    : null;
  const planSyncUpdatedLabel = planSyncStatus.updatedAt
    ? formatRelativeTime(planSyncStatus.updatedAt)
    : undefined;
  const planSnapshotCard = planSnapshot && planSnapshotCurrency
    ? (
      <PlanSnapshotCard
        snapshot={planSnapshot}
        currency={planSnapshotCurrency}
      />
    )
    : null;

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
      showStatus("Connect a TON wallet to link it to the desk.", "info");
      return;
    }

    if (!tonProof) {
      showStatus(
        "Wallet verification is not ready yet. Reconnect your TON wallet and try again.",
        "danger",
        { toast: true },
      );
      if (tonProofState.status !== "loading") {
        void refreshTonProofChallenge();
      }
      return;
    }

    setIsLinking(true);
    showStatus(null);

    const result = await linkTonMiniAppWallet({
      telegramId,
      wallet: {
        address: currentWallet.address ?? null,
        publicKey: currentWallet.publicKey ?? null,
        walletStateInit: currentWallet.walletStateInit ?? null,
      },
      proof: tonProof,
      walletAppName: tonConnectUI.wallet?.device?.appName ?? null,
    });

    setIsLinking(false);

    if (!result.ok) {
      console.error("[miniapp] Wallet link failed", result.error);
      showStatus(
        result.error ??
          "Unable to link your wallet right now. Please retry in a few moments.",
        "danger",
        { toast: true },
      );
      setWalletVerified(false);
      if (result.status === 401 || result.status === 400) {
        void refreshTonProofChallenge();
      }
      return;
    }

    setWalletVerified(true);
    setTonProofState({ status: "verified" });
    setTonProofChallenge(null);
    tonConnectUI.setConnectRequestParameters?.(null);
    showStatus("Wallet linked successfully. Desk access unlocked.", "success", {
      toast: true,
    });
  }

  async function startSubscription() {
    if (!tonConnectUI) {
      return;
    }

    const currentWallet = tonConnectUI.account;
    if (!currentWallet) {
      showStatus("Connect a TON wallet to continue.", "info");
      return;
    }

    if (!walletVerified) {
      showStatus(
        "Verify your TON wallet with the desk before starting a subscription.",
        "danger",
        { toast: true },
      );
      if (tonProofState.status !== "ready") {
        void refreshTonProofChallenge();
      }
      return;
    }

    const tonAmount = selectedPlan?.meta.tonAmount;
    if (!tonAmount || !Number.isFinite(tonAmount) || tonAmount <= 0) {
      showStatus(
        "Subscription pricing unavailable right now. Refresh and try again shortly.",
        "danger",
      );
      return;
    }

    const treasuryAddress = OPS_TREASURY_ADDRESS;
    if (!treasuryAddress) {
      showStatus(
        "Desk intake wallet unavailable. Please contact support to continue.",
        "danger",
        { toast: true },
      );
      return;
    }

    setIsProcessing(true);
    showStatus("Confirm the transfer in your TON wallet…", "info");
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
        throw new Error(
          "Unable to derive transaction hash from wallet response",
        );
      }

      setTxHash(derivedHash);
      showStatus("Transaction broadcasted. Verifying with the desk…", "success", {
        toast: true,
      });

      const result = await processTonMiniAppSubscription({
        telegramId,
        plan,
        txHash: derivedHash,
      });

      if (!result.ok) {
        console.error("[miniapp] Subscription request failed", result.error);
        showStatus(
          result.error ??
            "We couldn't start the subscription. Give it another try after checking your connection.",
          "danger",
          { toast: true },
        );
        return;
      }

      showStatus(
        `Subscription for ${
          selectedPlan?.name ?? "your plan"
        } submitted. Desk will confirm shortly.`,
        "success",
        { toast: true },
      );
    } catch (error) {
      console.error("[miniapp] TON transaction request failed", error);
      const rejection =
        typeof (error as { code?: number })?.code === "number" &&
          (error as { code: number }).code === 300
          ? "Transaction cancelled in wallet. No funds were moved."
          : null;

      showStatus(
        rejection ??
          "We couldn't start the subscription. Give it another try after checking your connection.",
        "danger",
        { toast: true },
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
        <HeroSection
          syncDescription="Auto-syncing Grok-1 + DeepSeek-V2 feed"
          syncCountdown={countdown}
          syncDisabled={liveIntel.isSyncing}
          isSyncing={liveIntel.isSyncing}
          onSyncRefresh={liveIntel.refresh}
          metrics={metrics}
          eyebrow="Dynamic Capital Desk"
          title="Signal-driven growth with TON settlements."
          subtitle="Seamlessly connect your TON wallet, auto-invest alongside our trading desk, and stay informed with every cycle."
          tonConnectButton={<TonConnectButton />}
          walletButtonLabel={walletVerified
            ? "Wallet verified"
            : isLinking
            ? "Linking…"
            : "Link wallet to desk"}
          onWalletButtonPress={linkWallet}
          walletButtonDisabled={isLinking || tonProofUi.linkDisabled}
          tonProofStatus={tonProofUi}
          onTonProofRetry={handleTonProofRetry}
          planTagline={activePlanVisual.tagline}
          walletLabel={formatWalletAddress(walletAddress)}
          telegramLabel={telegramId}
          planStatusLabel={heroPlanStatusText}
          planStatusTone={planSyncStatus.error ? "error" : "default"}
          liveFeedLabel={
            liveIntel.isSyncing
              ? "Syncing…"
              : formatRelativeTime(liveIntel.updatedAt)
          }
          selectedPlan={heroSelectedPlanSummary}
        />

        <PlanSelection
          title="Choose your runway"
          description="Unlock the same tooling our desk uses daily. Each tier adds deeper access, more detailed reporting, and quicker capital cycling."
          options={planOptions}
          selectedPlanId={plan}
          onSelectPlan={(planId) => setPlan(planId)}
          planSyncStatus={{
            ...planSyncStatus,
            updatedAt: planSyncUpdatedLabel,
          }}
          planVisuals={PLAN_VISUALS}
          selectedPlan={selectedPlan ?? null}
          planDetailMeta={{
            tonLabel: planTonLabel,
            dctLabel: planDctLabel,
            updatedLabel: planUpdatedLabel,
          }}
          planSnapshotCard={planSnapshotCard}
          onStartSubscription={startSubscription}
          isProcessing={isProcessing}
          walletVerified={walletVerified}
          walletHint="Verify your TON wallet above to unlock auto-invest routing."
          txHash={txHash}
        />

        <MintingGrid
          plans={THEME_MINT_PLANS}
          states={mintingStates}
          onStartMint={startThemeMint}
          formatRelativeTime={formatRelativeTime}
        />

        <LiveIntelligenceSection
          intel={liveIntel.report}
          status={liveIntel.status}
          isSyncing={liveIntel.isSyncing}
          updatedAt={liveIntel.updatedAt}
          countdown={countdown}
          error={liveIntel.error}
          onRefresh={liveIntel.refresh}
        />

        <TimelineView entries={timeline} />

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

        <Card
          as="section"
          id="support"
          padding="32"
          radius="xl"
          gap="32"
          background="surface"
        >
          <Column gap="12">
            <Heading as="h2" variant="display-strong-s">
              What you unlock
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-strong">
              Desk-level operators, structured playbooks, and real-time visibility to keep every cycle accountable.
            </Text>
          </Column>

          <Grid columns="3" gap="16" m={{ columns: "2" }} s={{ columns: "1" }}>
            {OVERVIEW_FEATURES.map((feature, index) => {
              const FeatureIcon = feature.icon;
              const accent = FEATURE_ACCENTS[index] ?? FEATURE_ACCENTS[0];
              return (
                <Card
                  key={feature.title}
                  as="article"
                  padding="24"
                  radius="xl"
                  background="surface"
                  border="neutral-alpha-medium"
                  gap="12"
                  data-accent={accent}
                >
                  <Row gap="12" vertical="center">
                    <Badge
                      effect={false}
                      background="accent-alpha-weak"
                      onBackground="accent-strong"
                      aria-hidden
                    >
                      <FeatureIcon size={18} />
                    </Badge>
                    <Heading as="h3" variant="display-strong-xs">
                      {feature.title}
                    </Heading>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-strong">
                    {feature.description}
                  </Text>
                </Card>
              );
            })}
          </Grid>

          <Grid columns="3" gap="16" m={{ columns: "2" }} s={{ columns: "1" }}>
            {SUPPORT_OPTIONS.map((option, index) => {
              const SupportIcon = option.icon;
              const accent = SUPPORT_ACCENTS[index] ?? SUPPORT_ACCENTS[0];
              return (
                <Card
                  key={option.title}
                  as="article"
                  padding="24"
                  radius="xl"
                  background="surface"
                  border="neutral-alpha-medium"
                  gap="12"
                  data-accent={accent}
                >
                  <Column gap="12">
                    <Row gap="12" vertical="center">
                      <Badge
                        effect={false}
                        background="accent-alpha-weak"
                        onBackground="accent-strong"
                        aria-hidden
                      >
                        <SupportIcon size={18} />
                      </Badge>
                      <Heading as="h3" variant="display-strong-xs">
                        {option.title}
                      </Heading>
                    </Row>
                    <Text variant="body-default-s" onBackground="neutral-strong">
                      {option.description}
                    </Text>
                    <Text variant="label-strong-s" onBackground="accent-strong">
                      {option.action}
                    </Text>
                  </Column>
                </Card>
              );
            })}
          </Grid>
        </Card>

        {statusNotice && statusBannerTone && (
          <Banner
            role="status"
            aria-live={statusNotice.tone === "danger" ? "assertive" : "polite"}
            solid={statusBannerTone.solid}
            onSolid={statusBannerTone.onSolid}
          >
            <Text
              variant="label-default-s"
              onBackground={statusBannerTone.onSolid}
            >
              {statusNotice.message}
            </Text>
          </Banner>
        )}
      </main>

      <ChatLauncher
        compact={isChatCompact}
        onOpen={handleChatLauncherClick}
      />

      <SectionNavigation
        ariaLabel="Mini app sections"
        items={NAV_ITEMS}
        activeId={activeSection}
        onSelect={(value) => scrollToSection(value as SectionId)}
      />
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
  const actions = intel?.recommendedActions ?? [];
  const hasIntel = Boolean(intel);

  const syncLabel = isSyncing
    ? "Syncing…"
    : countdown !== null
    ? `Next sync in ${countdown}s`
    : updatedAt
    ? `Updated ${formatRelativeTime(updatedAt)}`
    : "Awaiting sync";

  const deepseek = intel?.models.deepseek;
  const confidenceScore =
    typeof intel?.confidence === "number" && !Number.isNaN(intel.confidence)
      ? Math.min(Math.max(intel.confidence, 0), 1)
      : null;
  const riskScore =
    typeof deepseek?.riskScore === "number" && !Number.isNaN(deepseek.riskScore)
      ? Math.min(Math.max(deepseek.riskScore, 0), 1)
      : null;
  const chartData =
    confidenceScore === null && riskScore === null
      ? []
      : [
          { label: "Confidence", score: Math.round((confidenceScore ?? 0) * 100) },
          { label: "Risk", score: Math.round((riskScore ?? 0) * 100) },
        ];

  return (
    <Card as="section" id="intel" padding="32" radius="xl" gap="24" background="surface">
      <Row horizontal="between" vertical="center" wrap gap="16">
        <Column gap="8" flex={1} minWidth={20}>
          <Heading as="h2" variant="display-strong-s">
            Live desk intelligence
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-strong">
            Grok-1 strategy briefs are auto-synced with DeepSeek-V2 risk arbitration so every decision stays in lockstep with the desk.
          </Text>
        </Column>
        <Badge effect={false} background="neutral-alpha-weak" onBackground="neutral-strong">
          <Text variant="label-strong-s" onBackground="neutral-strong">
            {syncLabel}
          </Text>
        </Badge>
      </Row>

      {error && status === "error" && (
        <Banner padding="16" radius="l" background="danger-alpha-weak" border="danger-alpha-medium" gap="12" wrap vertical="center">
          <Text variant="body-default-s" onBackground="danger-strong">
            Unable to reach the intelligence feed right now. We'll retry automatically.
          </Text>
          <Button type="button" variant="secondary" onClick={onRefresh} label="Retry now" />
        </Banner>
      )}

      {error && status !== "error" && (
        <Banner padding="12" radius="l" background="warning-alpha-weak" border="warning-alpha-medium">
          <Text variant="body-default-s" onBackground="warning-strong">
            Brief network hiccup detected. Showing the last Grok-1 + DeepSeek-V2 sync while we refresh in the background.
          </Text>
        </Banner>
      )}

      <Column gap="16">
        <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="16" data-accent="cyan">
          <Row horizontal="between" vertical="center" wrap gap="12">
            <Heading as="h3" variant="display-strong-xs">
              Desk narrative
            </Heading>
            {confidenceLabel && (
              <Badge effect={false} background="accent-alpha-weak" onBackground="accent-strong">
                <Text variant="label-strong-xs" onBackground="accent-strong">
                  {confidenceLabel}
                </Text>
              </Badge>
            )}
          </Row>
          {hasIntel ? (
            <Text variant="body-default-m" onBackground="neutral-strong">
              {intel?.narrative}
            </Text>
          ) : (
            <Column gap="8">
              <Skeleton shape="line" width="xl" />
              <Skeleton shape="line" width="l" />
              <Skeleton shape="line" width="m" />
            </Column>
          )}
          {hasIntel ? (
            alerts.length > 0 ? (
              <List as="ul" gap="8">
                {alerts.map((alert) => (
                  <Row as="li" key={alert} gap="8" vertical="center">
                    <StatusIndicator size="s" color="orange" />
                    <Text variant="label-default-s" onBackground="neutral-strong">
                      {alert}
                    </Text>
                  </Row>
                ))}
              </List>
            ) : (
              <Text variant="label-default-s" onBackground="neutral-medium">
                No blocking alerts flagged by DeepSeek-V2 sentinel.
              </Text>
            )
          ) : (
            <IntelListSkeleton />
          )}
        </Card>

        <Grid columns="2" gap="16" s={{ columns: "1" }}>
          <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="12" data-accent="emerald">
            <Heading as="h3" variant="display-strong-xs">
              Opportunities
            </Heading>
            {hasIntel ? (
              opportunities.length > 0 ? (
                <List as="ul" gap="8">
                  {opportunities.map((item) => (
                    <Row as="li" key={item} gap="8" vertical="center">
                      <StatusIndicator size="s" color="green" />
                      <Text variant="label-default-s" onBackground="neutral-strong">
                        {item}
                      </Text>
                    </Row>
                  ))}
                </List>
              ) : (
                <Text variant="label-default-s" onBackground="neutral-medium">
                  Grok-1 has not surfaced new opportunities yet.
                </Text>
              )
            ) : (
              <IntelListSkeleton />
            )}
          </Card>

          <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="12" data-accent="magenta">
            <Heading as="h3" variant="display-strong-xs">
              Risks
            </Heading>
            {hasIntel ? (
              risks.length > 0 ? (
                <List as="ul" gap="8">
                  {risks.map((item) => (
                    <Row as="li" key={item} gap="8" vertical="center">
                      <StatusIndicator size="s" color="red" />
                      <Text variant="label-default-s" onBackground="neutral-strong">
                        {item}
                      </Text>
                    </Row>
                  ))}
                </List>
              ) : (
                <Text variant="label-default-s" onBackground="neutral-medium">
                  DeepSeek-V2 has not flagged immediate risks.
                </Text>
              )
            ) : (
              <IntelListSkeleton />
            )}
          </Card>
        </Grid>

        <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="12">
          <Heading as="h3" variant="display-strong-xs">
            Recommended actions
          </Heading>
          {hasIntel ? (
            actions.length > 0 ? (
              <List as="ul" gap="8">
                {actions.map((item) => (
                  <Row as="li" key={item} gap="8" vertical="center">
                    <StatusIndicator size="s" color="cyan" />
                    <Text variant="label-default-s" onBackground="neutral-strong">
                      {item}
                    </Text>
                  </Row>
                ))}
              </List>
            ) : (
              <Text variant="label-default-s" onBackground="neutral-medium">
                Desk actions will populate once the next cycle begins.
              </Text>
            )
          ) : (
            <IntelListSkeleton />
          )}
        </Card>

        {chartData.length > 0 && (
          <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="12">
            <Row horizontal="between" vertical="center" wrap gap="8">
              <Heading as="h3" variant="display-strong-xs">
                Signal cadence
              </Heading>
              <Text variant="label-default-s" onBackground="neutral-medium">
                Confidence vs. DeepSeek risk index
              </Text>
            </Row>
            <BarChart
              data={chartData}
              series={{ key: "score" }}
              legend={{ display: false }}
              axis="x"
              grid="none"
              height="160"
            />
          </Card>
        )}

        {intel ? (
          <ModelBreakdown intel={intel} />
        ) : (
          <Grid columns="2" gap="16" s={{ columns: "1" }}>
            {Array.from({ length: 2 }).map((_, index) => (
              <Card
                key={`model-skeleton-${index}`}
                padding="24"
                radius="xl"
                background="surface"
                border="neutral-alpha-medium"
                gap="12"
              >
                <Skeleton shape="line" width="m" />
                <Skeleton shape="line" width="xl" />
                <IntelListSkeleton />
              </Card>
            ))}
          </Grid>
        )}
      </Column>
    </Card>
  );
}

function IntelListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Column gap="8">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={`intel-skeleton-${index}`} shape="line" width="xl" />
      ))}
    </Column>
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
  const background =
    tone === "negative"
      ? "danger-alpha-weak"
      : tone === "positive"
      ? "success-alpha-weak"
      : "neutral-alpha-weak";
  const border =
    tone === "negative"
      ? "danger-alpha-medium"
      : tone === "positive"
      ? "success-alpha-medium"
      : "neutral-alpha-medium";
  const textTone =
    tone === "negative"
      ? "danger-strong"
      : tone === "positive"
      ? "success-strong"
      : "neutral-strong";

  return (
    <Column padding="16" radius="l" background={background} border={border} gap="4">
      <Text variant="label-default-s" onBackground="neutral-medium">
        {label}
      </Text>
      <Text variant="label-strong-m" onBackground={textTone}>
        {value}
      </Text>
    </Column>
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
    <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="16" data-accent="cyan">
      <Row horizontal="between" vertical="center" wrap gap="12">
        <Column gap="4">
          <Heading as="h3" variant="display-strong-xs">
            Live pricing snapshot
          </Heading>
          <Text variant="label-default-s" onBackground="neutral-medium">
            Supabase desk feed
          </Text>
        </Column>
        {computedLabel && (
          <Badge effect={false} background="neutral-alpha-weak" onBackground="neutral-strong">
            <Text variant="label-strong-xs" onBackground="neutral-strong">
              Updated {computedLabel}
            </Text>
          </Badge>
        )}
      </Row>
      <Grid columns="2" gap="12" s={{ columns: "1" }}>
        {displayLabel && <SnapshotMetric label="Display price" value={displayLabel} />}
        {dynamicLabel && <SnapshotMetric label="Dynamic price" value={dynamicLabel} />}
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
      </Grid>
      {adjustments.length > 0 && (
        <Column gap="12">
          <Text variant="label-strong-s" onBackground="neutral-medium">
            Adjustment mix
          </Text>
          <List as="ul" gap="8">
            {adjustments.map((item) => {
              const percentLabel = formatPercent(item.value * 100, 1);
              const isNegative = item.value < 0;
              return (
                <Row as="li" key={item.key} horizontal="between" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-strong">
                    {formatAdjustmentLabel(item.key)}
                  </Text>
                  {percentLabel && (
                    <Text
                      variant="label-strong-s"
                      onBackground={isNegative ? "danger-strong" : "success-strong"}
                    >
                      {percentLabel}
                    </Text>
                  )}
                </Row>
              );
            })}
          </List>
        </Column>
      )}
    </Card>
  );
}

function ModelBreakdown({ intel }: { intel: LiveIntelSnapshot }) {
  const grok = intel.models.grok;
  const deepseek = intel.models.deepseek;
  const riskScore =
    typeof deepseek.riskScore === "number" && !Number.isNaN(deepseek.riskScore)
      ? Math.min(Math.max(deepseek.riskScore, 0), 1)
      : null;
  const riskLevel = riskSeverity(riskScore ?? undefined);
  const riskLabel = riskScore === null
    ? "Risk scan"
    : `${Math.round(riskScore * 100)}% risk`;
  const riskAccent = riskLevel === "high" ? "red" : riskLevel === "medium" ? "yellow" : "emerald";
  const riskIndicatorColor = riskLevel === "high" ? "red" : riskLevel === "medium" ? "yellow" : "green";

  return (
    <Grid columns="2" gap="16" s={{ columns: "1" }}>
      <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="12" data-accent="cyan">
        <Column gap="12">
          <Row horizontal="between" vertical="center" wrap gap="12">
            <Column gap="4">
              <Text variant="label-strong-s" onBackground="neutral-medium">
                Grok-1 strategist
              </Text>
              <Heading as="h3" variant="display-strong-xs">
                {grok.focus}
              </Heading>
            </Column>
          </Row>
          <Text variant="body-default-m" onBackground="neutral-strong">
            {grok.summary}
          </Text>
          <List as="ul" gap="8">
            {grok.highlights.map((item) => (
              <Row as="li" key={item} gap="8" vertical="center">
                <StatusIndicator size="s" color="cyan" />
                <Text variant="label-default-s" onBackground="neutral-strong">
                  {item}
                </Text>
              </Row>
            ))}
          </List>
        </Column>
      </Card>

      <Card padding="24" radius="xl" background="surface" border="neutral-alpha-medium" gap="12" data-accent={riskAccent}>
        <Column gap="12">
          <Row horizontal="between" vertical="center" wrap gap="12">
            <Column gap="4">
              <Text variant="label-strong-s" onBackground="neutral-medium">
                DeepSeek-V2 sentinel
              </Text>
              <Heading as="h3" variant="display-strong-xs">
                {deepseek.focus}
              </Heading>
            </Column>
            <Badge effect={false} background="accent-alpha-weak" onBackground="accent-strong">
              <Text variant="label-strong-xs" onBackground="accent-strong">
                {riskLabel}
              </Text>
            </Badge>
          </Row>
          <Text variant="body-default-m" onBackground="neutral-strong">
            {deepseek.summary}
          </Text>
          <List as="ul" gap="8">
            {deepseek.highlights.map((item) => (
              <Row as="li" key={item} gap="8" vertical="center">
                <StatusIndicator size="s" color={riskIndicatorColor} />
                <Text variant="label-default-s" onBackground="neutral-strong">
                  {item}
                </Text>
              </Row>
            ))}
          </List>
        </Column>
      </Card>
    </Grid>
  );
}

function HomeIcon({
  active,
  className,
}: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      data-active={active ? "true" : "false"}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
      focusable="false"
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

function SparkIcon({
  active,
  className,
}: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      data-active={active ? "true" : "false"}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
      focusable="false"
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

function RadarIcon({
  active,
  className,
}: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      data-active={active ? "true" : "false"}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
      focusable="false"
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

function ActivityIcon({
  active,
  className,
}: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      data-active={active ? "true" : "false"}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
      focusable="false"
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

function MintIcon({
  active,
  className,
}: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      data-active={active ? "true" : "false"}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
      focusable="false"
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

function PaletteIcon({
  active,
  className,
}: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      data-active={active ? "true" : "false"}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
      focusable="false"
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

function LifebuoyIcon({
  active,
  className,
}: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      data-active={active ? "true" : "false"}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
      focusable="false"
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
      {error
        ? <TonManifestFallbackBanner message={error} onRetry={retry} />
        : null}
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
            We’ll keep trying in the background. You can also manually retry
            now.
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
