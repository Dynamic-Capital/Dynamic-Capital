import type { ServerSupabaseClient } from "@/lib/supabase-server";

type SupabaseServerClient = ServerSupabaseClient;

import type { Database } from "@/types/supabase";

const INVESTOR_EQUITY_VIEW = "investor_equity_overview" as const;
const BURN_TOTALS_VIEW = "dct_burn_totals" as const;
const SUBSCRIPTION_STATUS_VIEW = "investor_subscription_status" as const;
const BUYBACK_EVENTS_VIEW = "dct_buyback_events" as const;

type RawEquityRow = {
  profile_id?: string | null;
  contribution_usdt?: number | string | null;
  marked_equity_usdt?: number | string | null;
  profit_loss_usdt?: number | string | null;
  last_valuation_at?: string | null;
};

type RawBurnTotalsRow = {
  burn_ton?: number | string | null;
  dct_burned?: number | string | null;
  operations_ton?: number | string | null;
  auto_invest_ton?: number | string | null;
  updated_at?: string | null;
};

type RawSubscriptionStatusRow = {
  profile_id?: string | null;
  plan_name?: string | null;
  status?: string | null;
  next_renewal_at?: string | null;
  last_payment_at?: string | null;
  is_paused?: boolean | null;
};

type RawBuybackRow = {
  executed_at?: string | null;
  burn_ton?: number | string | null;
  dct_burned?: number | string | null;
  burn_tx_hash?: string | null;
  router_swap_id?: string | null;
};

type InvestorView<Row> = {
  Row: Row;
  Insert: never;
  Update: never;
  Relationships: [];
};

type InvestorViews = {
  investor_equity_overview: InvestorView<RawEquityRow>;
  dct_burn_totals: InvestorView<RawBurnTotalsRow>;
  investor_subscription_status: InvestorView<RawSubscriptionStatusRow>;
  dct_buyback_events: InvestorView<RawBuybackRow>;
};

type InvestorSchema = Omit<Database["public"], "Views"> & {
  Views: Database["public"]["Views"] & InvestorViews;
};

type InvestorDatabase = Omit<Database, "public"> & {
  public: InvestorSchema;
};

export type { InvestorDatabase };

export interface InvestorEquity {
  contributionUsd: number;
  markedEquityUsd: number;
  profitLossUsd: number;
  lastValuationAt: string | null;
}

export interface BurnTotals {
  burnTon: number;
  dctBurned: number;
  operationsTon: number;
  autoInvestTon: number;
  updatedAt: string | null;
}

export interface SubscriptionStatus {
  planName: string;
  status: string;
  nextRenewalAt: string | null;
  lastPaymentAt: string | null;
  isPaused: boolean;
}

export interface BuybackEvent {
  executedAt: string | null;
  burnTon: number;
  dctBurned: number;
  burnTxHash: string | null;
  routerSwapId: string | null;
}

export interface InvestorOverview {
  equity: InvestorEquity;
  burnTotals: BurnTotals;
  subscription: SubscriptionStatus | null;
  lastBuyback: BuybackEvent | null;
  buybackHistory: BuybackEvent[];
}

export function normalizeNumeric(
  value: number | string | null | undefined,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function assertProfileAccess(
  profileId: string | null | undefined,
): asserts profileId is string {
  if (typeof profileId !== "string" || profileId.trim().length === 0) {
    throw new Error("Authentication required to access investor data.");
  }
}

export function normalizeEquityRow(row: RawEquityRow | null): InvestorEquity {
  return {
    contributionUsd: normalizeNumeric(row?.contribution_usdt),
    markedEquityUsd: normalizeNumeric(row?.marked_equity_usdt),
    profitLossUsd: normalizeNumeric(row?.profit_loss_usdt),
    lastValuationAt: row?.last_valuation_at ?? null,
  };
}

export function normalizeBurnTotals(
  row: RawBurnTotalsRow | null,
): BurnTotals {
  return {
    burnTon: normalizeNumeric(row?.burn_ton),
    dctBurned: normalizeNumeric(row?.dct_burned),
    operationsTon: normalizeNumeric(row?.operations_ton),
    autoInvestTon: normalizeNumeric(row?.auto_invest_ton),
    updatedAt: row?.updated_at ?? null,
  };
}

export function normalizeSubscription(
  row: RawSubscriptionStatusRow | null,
): SubscriptionStatus | null {
  if (!row) return null;

  const planName = typeof row.plan_name === "string" ? row.plan_name : "";
  const status = typeof row.status === "string" ? row.status : "unknown";

  return {
    planName,
    status,
    nextRenewalAt: row.next_renewal_at ?? null,
    lastPaymentAt: row.last_payment_at ?? null,
    isPaused: row.is_paused === true,
  };
}

export function normalizeBuyback(
  row: RawBuybackRow | null,
): BuybackEvent | null {
  if (!row) return null;
  return {
    executedAt: row.executed_at ?? null,
    burnTon: normalizeNumeric(row.burn_ton),
    dctBurned: normalizeNumeric(row.dct_burned),
    burnTxHash: row.burn_tx_hash ?? null,
    routerSwapId: row.router_swap_id ?? null,
  };
}

export async function fetchInvestorEquity(
  client: SupabaseServerClient,
  profileId: string,
): Promise<InvestorEquity> {
  assertProfileAccess(profileId);

  const { data, error } = await client
    .from(INVESTOR_EQUITY_VIEW)
    .select(
      "contribution_usdt, marked_equity_usdt, profit_loss_usdt, last_valuation_at",
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load investor equity.");
  }

  return normalizeEquityRow(data as RawEquityRow | null);
}

export async function fetchBurnTotals(
  client: SupabaseServerClient,
): Promise<BurnTotals> {
  const { data, error } = await client
    .from(BURN_TOTALS_VIEW)
    .select(
      "burn_ton, dct_burned, operations_ton, auto_invest_ton, updated_at",
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load burn totals.");
  }

  return normalizeBurnTotals(data as RawBurnTotalsRow | null);
}

export async function fetchSubscriptionStatus(
  client: SupabaseServerClient,
  profileId: string,
): Promise<SubscriptionStatus | null> {
  assertProfileAccess(profileId);

  const { data, error } = await client
    .from(SUBSCRIPTION_STATUS_VIEW)
    .select(
      "plan_name, status, next_renewal_at, last_payment_at, is_paused",
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load subscription status.");
  }

  return normalizeSubscription(data as RawSubscriptionStatusRow | null);
}

export interface BuybackHistoryOptions {
  limit?: number;
}

export async function fetchBuybackHistory(
  client: SupabaseServerClient,
  { limit = 24 }: BuybackHistoryOptions = {},
): Promise<BuybackEvent[]> {
  const { data, error } = await client
    .from(BUYBACK_EVENTS_VIEW)
    .select(
      "executed_at, burn_ton, dct_burned, burn_tx_hash, router_swap_id",
    )
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Failed to load buyback history.");
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) => normalizeBuyback(row as RawBuybackRow | null))
    .filter((event): event is BuybackEvent => event !== null)
    .reverse();
}

export async function fetchInvestorOverview(
  client: SupabaseServerClient,
  profileId: string,
): Promise<InvestorOverview> {
  assertProfileAccess(profileId);

  const [equity, burnTotals, subscription, buybackHistory] = await Promise.all([
    fetchInvestorEquity(client, profileId),
    fetchBurnTotals(client),
    fetchSubscriptionStatus(client, profileId),
    fetchBuybackHistory(client),
  ]);

  const lastBuyback = buybackHistory.length
    ? buybackHistory[buybackHistory.length - 1]
    : null;

  return {
    equity,
    burnTotals,
    subscription,
    lastBuyback,
    buybackHistory,
  };
}
