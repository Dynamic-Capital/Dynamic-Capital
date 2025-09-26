import { createClient, type SupabaseClient } from "../_shared/client.ts";
import { optionalEnv } from "../_shared/env.ts";

export type SwapTag = "auto-invest" | "buyback-burn";

export interface SplitConfig {
  operationsPct: number;
  autoInvestPct: number;
  buybackBurnPct: number;
}

export type VerifiedTonPayment = {
  ok: true;
  amountTon: number;
  blockTime?: string;
} | {
  ok: false;
  error: string;
};

export interface SwapResult {
  dctAmount: number;
  swapTxHash: string;
  routerSwapId: string;
  priceSnapshotId: string | null;
  oraclePrice: number | null;
  usdNotional: number;
}

export interface StakeConfig {
  months: number | null;
  multiplier: number;
}

const LOCK_CONFIG: Record<string, StakeConfig> = {
  "vip_bronze": { months: 3, multiplier: 1.2 },
  "vip_silver": { months: 6, multiplier: 1.5 },
  "vip_gold": { months: 12, multiplier: 2.0 },
  "mentorship": { months: 6, multiplier: 1.35 },
};

const EARLY_EXIT_PENALTY_BPS = 200;

const ORACLE_SYMBOL = "DCTUSDT";

function resolveStakeConfig(plan: string): StakeConfig {
  return LOCK_CONFIG[plan] ?? { months: null, multiplier: 1.0 };
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

export function roundTon(value: number): number {
  return Number(value.toFixed(9));
}

async function fetchOraclePrice() {
  const supabase = createClient("service");
  const { data, error } = await supabase
    .from("price_snapshots")
    .select("id, price_usd, signed_at")
    .eq("symbol", ORACLE_SYMBOL)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Oracle lookup failed: ${error.message}`);
  }
  if (!data) {
    throw new Error("Oracle price unavailable");
  }
  const price = Number(data.price_usd);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Oracle price invalid");
  }
  const signedAt = Date.parse(data.signed_at);
  if (!Number.isFinite(signedAt)) {
    throw new Error("Oracle snapshot missing timestamp");
  }
  const ageMs = Date.now() - signedAt;
  if (ageMs > 10 * 60 * 1000) {
    throw new Error("Oracle price stale");
  }
  return { price, snapshotId: data.id as string | null };
}

async function defaultExecuteSwap(
  tonAmount: number,
  tag: SwapTag,
): Promise<SwapResult> {
  if (tonAmount <= 0) {
    return {
      dctAmount: 0,
      swapTxHash: "",
      routerSwapId: "",
      priceSnapshotId: null,
      oraclePrice: null,
      usdNotional: 0,
    };
  }

  const tonUsdOverride = optionalEnv("TON_USD_PRICE");
  const tonUsd = tonUsdOverride ? Number(tonUsdOverride) : 1;
  if (!Number.isFinite(tonUsd) || tonUsd <= 0) {
    throw new Error("Invalid TON_USD_PRICE value");
  }

  const priceOverrideRaw = optionalEnv("DCT_PRICE_OVERRIDE");
  if (priceOverrideRaw) {
    const price = Number(priceOverrideRaw);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Invalid DCT_PRICE_OVERRIDE value");
    }
    const usdNotional = roundTon(tonAmount * tonUsd);
    const dctAmount = roundTon(usdNotional / price);
    return {
      dctAmount,
      swapTxHash: `simulated-${tag}`,
      routerSwapId: `sim-${crypto.randomUUID()}`,
      priceSnapshotId: null,
      oraclePrice: price,
      usdNotional,
    };
  }

  const oracle = await fetchOraclePrice();
  const usdNotional = roundTon(tonAmount * tonUsd);
  const dctAmount = roundTon(usdNotional / oracle.price);
  return {
    dctAmount,
    swapTxHash: `allocator-${tag}-${crypto.randomUUID()}`,
    routerSwapId: oracle.snapshotId ?? "",
    priceSnapshotId: oracle.snapshotId ?? null,
    oraclePrice: oracle.price,
    usdNotional,
  };
}

async function defaultTriggerBurn(
  amountDct: number,
  context: Record<string, unknown>,
): Promise<string | null> {
  if (amountDct <= 0) return null;
  const burnHook = optionalEnv("BURN_WEBHOOK_URL");
  if (!burnHook) return null;

  const response = await fetch(burnHook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      amount: amountDct,
      ...context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Burn webhook error ${response.status}`);
  }

  const payload = await response.json().catch(
    () => ({} as Record<string, unknown>),
  );
  const burnTxHash = payload.txHash ?? payload.burnTxHash ?? null;
  return burnTxHash ? String(burnTxHash) : null;
}

export class SubscriptionManagerError extends Error {}

export class SwapExecutionError extends SubscriptionManagerError {}

export class BurnTriggerError extends SubscriptionManagerError {}

export class PersistenceError extends SubscriptionManagerError {}

export class DuplicateSubscriptionError extends SubscriptionManagerError {}

export interface SubscriptionManagerDependencies {
  supabase: SupabaseClient;
  executeSwap?: (
    tonAmount: number,
    tag: SwapTag,
  ) => Promise<SwapResult>;
  triggerBurn?: (
    amountDct: number,
    context: Record<string, unknown>,
  ) => Promise<string | null>;
  now?: () => Date;
}

export interface SubscriptionBeneficiary {
  telegramId?: number | null;
  walletAddress: string;
  tonDomain?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SubscriptionPaymentDetails {
  plan: string;
  tonTxHash: string;
  tonAmount: number;
  operationsTon: number;
  autoInvestTon: number;
  burnTon: number;
  splits: SplitConfig;
  verification: VerifiedTonPayment;
  operationsWallet: string;
  dctMaster: string;
  nextRenewalAt?: string | null;
  paymentId?: string | null;
}

export interface SubscriptionReceipt {
  userId: string;
  subscriptionId: string;
  stakeId: string | null;
  tonAmount: number;
  splits: SplitConfig;
  autoInvest: {
    ton: number;
    dct: number;
    swapTxHash: string;
  };
  burn: {
    ton: number;
    dct: number;
    swapTxHash: string;
    burnTxHash: string | null;
  };
  operations: {
    ton: number;
    wallet: string;
  };
  nextRenewalAt: string | null;
  processedAt: string;
}

export class SubscriptionManager {
  private readonly supabase: SupabaseClient;
  private readonly executeSwapImpl: (
    tonAmount: number,
    tag: SwapTag,
  ) => Promise<SwapResult>;
  private readonly triggerBurnImpl: (
    amountDct: number,
    context: Record<string, unknown>,
  ) => Promise<string | null>;
  private readonly nowFn: () => Date;

  constructor(private readonly deps: SubscriptionManagerDependencies) {
    this.supabase = deps.supabase;
    this.executeSwapImpl = deps.executeSwap ?? defaultExecuteSwap;
    this.triggerBurnImpl = deps.triggerBurn ?? defaultTriggerBurn;
    this.nowFn = deps.now ?? (() => new Date());
  }

  private now(): Date {
    return this.nowFn();
  }

  private async ensureNotDuplicate(txHash: string) {
    const { data, error } = await this.supabase
      .from("dct_subscriptions")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();
    if (error) {
      throw new PersistenceError(
        `Failed to check duplicates: ${error.message}`,
      );
    }
    if (data) {
      throw new DuplicateSubscriptionError(
        "Subscription already recorded for this transaction",
      );
    }
  }

  async payFor(
    beneficiary: SubscriptionBeneficiary,
    details: SubscriptionPaymentDetails,
  ): Promise<SubscriptionReceipt> {
    let autoInvestSwap: SwapResult;
    let burnSwap: SwapResult;
    try {
      autoInvestSwap = await this.executeSwapImpl(
        details.autoInvestTon,
        "auto-invest",
      );
      burnSwap = await this.executeSwapImpl(details.burnTon, "buyback-burn");
    } catch (error) {
      throw new SwapExecutionError(
        error instanceof Error ? error.message : "Swap failed",
        { cause: error instanceof Error ? error : undefined },
      );
    }

    let burnTxHash: string | null = null;
    try {
      burnTxHash = await this.triggerBurnImpl(burnSwap.dctAmount, {
        tonTxHash: details.tonTxHash,
        dctMaster: details.dctMaster,
      });
    } catch (error) {
      throw new BurnTriggerError(
        error instanceof Error ? error.message : "Burn hook failed",
        { cause: error instanceof Error ? error : undefined },
      );
    }

    const userPayload = {
      telegram_id: beneficiary.telegramId ?? null,
      wallet_address: beneficiary.walletAddress,
      ton_domain: beneficiary.tonDomain ?? null,
      metadata: beneficiary.metadata ?? null,
    } as Record<string, unknown>;

    const { data: user, error: userError } = await this.supabase
      .from("dct_users")
      .upsert(userPayload, { onConflict: "wallet_address" })
      .select()
      .single();

    if (userError || !user) {
      throw new PersistenceError(
        `Failed to upsert user: ${userError?.message ?? "unknown error"}`,
      );
    }

    await this.ensureNotDuplicate(details.tonTxHash);

    const subscriptionId = crypto.randomUUID();
    const processedAt = this.now().toISOString();
    const stakeConfig = resolveStakeConfig(details.plan);
    const totalDct = roundTon(autoInvestSwap.dctAmount + burnSwap.dctAmount);
    const autoInvestDct = roundTon(autoInvestSwap.dctAmount);
    const burnDct = roundTon(burnSwap.dctAmount);

    const subscriptionRecord = {
      id: subscriptionId,
      user_id: user.id,
      plan: details.plan,
      ton_paid: roundTon(details.tonAmount),
      operations_ton: details.operationsTon,
      auto_invest_ton: details.autoInvestTon,
      burn_ton: details.burnTon,
      dct_bought: totalDct,
      dct_auto_invest: autoInvestDct,
      dct_burned: burnDct,
      tx_hash: details.tonTxHash,
      router_swap_id: autoInvestSwap.routerSwapId || burnSwap.routerSwapId ||
        null,
      burn_tx_hash: burnTxHash,
      split_operations_pct: details.splits.operationsPct,
      split_auto_invest_pct: details.splits.autoInvestPct,
      split_burn_pct: details.splits.buybackBurnPct,
      next_renewal_at: details.nextRenewalAt ?? null,
      notes: {
        source: "dct-auto-invest",
        paymentId: details.paymentId ?? null,
        verification: details.verification,
        swaps: {
          autoInvest: autoInvestSwap,
          burn: burnSwap,
        },
        valuations: {
          autoInvestUsd: autoInvestSwap.usdNotional,
          burnUsd: burnSwap.usdNotional,
          oraclePrice: autoInvestSwap.oraclePrice ?? burnSwap.oraclePrice,
          priceSnapshotId: autoInvestSwap.priceSnapshotId ??
            burnSwap.priceSnapshotId ?? null,
        },
      },
    };

    const { error: subscriptionError } = await this.supabase
      .from("dct_subscriptions")
      .insert(subscriptionRecord);

    if (subscriptionError) {
      throw new PersistenceError(
        `Failed to record subscription: ${subscriptionError.message}`,
      );
    }

    let stakeId: string | null = null;
    if (autoInvestDct > 0) {
      const weight = roundTon(autoInvestDct * stakeConfig.multiplier);
      const lockUntil = stakeConfig.months
        ? addMonths(this.now(), stakeConfig.months)
        : null;
      stakeId = crypto.randomUUID();
      const { error: stakeError } = await this.supabase
        .from("dct_stakes")
        .insert({
          id: stakeId,
          user_id: user.id,
          subscription_id: subscriptionId,
          dct_amount: autoInvestDct,
          multiplier: stakeConfig.multiplier,
          weight,
          lock_months: stakeConfig.months,
          lock_until: lockUntil ? lockUntil.toISOString() : null,
          early_exit_penalty_bps: EARLY_EXIT_PENALTY_BPS,
          status: "active",
          notes: {
            plan: details.plan,
            tonTxHash: details.tonTxHash,
          },
        });

      if (stakeError) {
        throw new PersistenceError(
          `Failed to create stake: ${stakeError.message}`,
        );
      }
    }

    return {
      userId: user.id,
      subscriptionId,
      stakeId,
      tonAmount: roundTon(details.tonAmount),
      splits: details.splits,
      autoInvest: {
        ton: details.autoInvestTon,
        dct: autoInvestDct,
        swapTxHash: autoInvestSwap.swapTxHash,
      },
      burn: {
        ton: details.burnTon,
        dct: burnDct,
        swapTxHash: burnSwap.swapTxHash,
        burnTxHash,
      },
      operations: {
        ton: details.operationsTon,
        wallet: details.operationsWallet,
      },
      nextRenewalAt: details.nextRenewalAt ?? null,
      processedAt,
    };
  }
}
