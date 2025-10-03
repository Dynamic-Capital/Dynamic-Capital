import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, json, methodNotAllowed } from "../_shared/http.ts";
import { createClient } from "../_shared/client.ts";
import { optionalEnv } from "../_shared/env.ts";
import {
  publishBurnExecutedEvent,
  publishPaymentRecordedEvent,
} from "./events.ts";

interface SubscriptionRequest {
  initData?: string;
  paymentId?: string;
  tonAmount: number;
  tonTxHash: string;
  plan: string;
  telegramId?: number;
  walletAddress: string;
  tonDomain?: string;
  splits?: Partial<SplitConfig>;
  nextRenewalAt?: string;
  metadata?: Record<string, unknown>;
}

interface SplitConfig {
  operationsPct: number;
  autoInvestPct: number;
  buybackBurnPct: number;
}

interface SplitBounds {
  min: number;
  max: number;
}

type SwapTag = "auto-invest" | "buyback-burn";

type VerifiedTonPayment = {
  ok: true;
  amountTon: number;
  blockTime?: string;
} | {
  ok: false;
  error: string;
};

interface SwapResult {
  dctAmount: number;
  swapTxHash: string;
  routerSwapId: string;
  priceSnapshotId: string | null;
  oraclePrice: number | null;
  usdNotional: number;
}

interface StakeConfig {
  months: number | null;
  multiplier: number;
}

const DEFAULT_SPLITS: SplitConfig = {
  operationsPct: 60,
  autoInvestPct: 30,
  buybackBurnPct: 10,
};

const SPLIT_BOUNDS: Record<keyof SplitConfig, SplitBounds> = {
  operationsPct: { min: 40, max: 75 },
  autoInvestPct: { min: 15, max: 45 },
  buybackBurnPct: { min: 5, max: 20 },
};

const LOCK_CONFIG: Record<string, StakeConfig> = {
  "vip_bronze": { months: 3, multiplier: 1.2 },
  "vip_silver": { months: 6, multiplier: 1.5 },
  "vip_gold": { months: 12, multiplier: 2.0 },
  "mentorship": { months: 6, multiplier: 1.35 },
};

const EARLY_EXIT_PENALTY_BPS = 200;

const ORACLE_SYMBOL = "DCTUSDT";

const serviceSupabase = createClient("service");
type SupabaseClient = typeof serviceSupabase;

interface DctAppConfig {
  operationsWallet: string;
  intakeWallet: string | null;
  dctMaster: string;
  dexRouter: string;
  tonIndexerUrl: string | null;
}

function toNonEmptyString(value: unknown, field: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  throw new Error(`DCT app config missing ${field}`);
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchAppConfig(
  client: SupabaseClient,
): Promise<DctAppConfig> {
  const { data, error } = await client
    .from("dct_app_config")
    .select(
      "operations_wallet, ton_intake_wallet, dct_jetton_master, dex_router, ton_indexer_url",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load DCT app config: ${error.message}`);
  }

  if (!data) {
    throw new Error("DCT app config row is missing");
  }

  return {
    operationsWallet: toNonEmptyString(
      data.operations_wallet,
      "operations_wallet",
    ),
    intakeWallet: toOptionalString(data.ton_intake_wallet),
    dctMaster: toNonEmptyString(data.dct_jetton_master, "dct_jetton_master"),
    dexRouter: toNonEmptyString(data.dex_router, "dex_router"),
    tonIndexerUrl: toOptionalString(data.ton_indexer_url),
  };
}

async function fetchOraclePrice() {
  const { data, error } = await serviceSupabase
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

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase();
}

function validateSplits(
  partial: Partial<SplitConfig> | undefined,
): SplitConfig {
  const merged: SplitConfig = {
    operationsPct: partial?.operationsPct ?? DEFAULT_SPLITS.operationsPct,
    autoInvestPct: partial?.autoInvestPct ?? DEFAULT_SPLITS.autoInvestPct,
    buybackBurnPct: partial?.buybackBurnPct ?? DEFAULT_SPLITS.buybackBurnPct,
  };

  const sum = merged.operationsPct + merged.autoInvestPct +
    merged.buybackBurnPct;
  if (sum !== 100) {
    throw new Error("Split percentages must sum to 100");
  }

  for (
    const [key, bounds] of Object.entries(SPLIT_BOUNDS) as [
      keyof SplitConfig,
      SplitBounds,
    ][]
  ) {
    const value = merged[key];
    if (value < bounds.min || value > bounds.max) {
      throw new Error(`${key} must be between ${bounds.min} and ${bounds.max}`);
    }
  }

  return merged;
}

function roundTon(value: number): number {
  return Number(value.toFixed(9));
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

async function verifyTonPayment(
  txHash: string,
  expectedWallet: string,
  expectedAmount: number,
  indexerUrl: string | null,
): Promise<VerifiedTonPayment> {
  if (!indexerUrl) {
    return { ok: true, amountTon: expectedAmount };
  }

  const response = await fetch(
    `${indexerUrl.replace(/\/$/, "")}/transactions/${txHash}`,
  );
  if (!response.ok) {
    return { ok: false, error: `Indexer returned ${response.status}` };
  }

  const payload = await response.json();
  const destination: string | undefined = payload.destination ??
    payload.account?.address ??
    payload.in_msg?.destination ??
    payload.out_msg?.destination;
  if (!destination) {
    return { ok: false, error: "Indexer response missing destination" };
  }

  const normalizedDestination = normalizeAddress(String(destination));
  if (normalizedDestination !== normalizeAddress(expectedWallet)) {
    return { ok: false, error: "Funds not received by intake wallet" };
  }

  const amountCandidate = payload.amountTon ?? payload.amount ??
    payload.value ?? payload.coins ?? payload.in_msg?.value ?? 0;
  const amountNumeric = Number(amountCandidate);
  const amountTon = amountNumeric > 1_000_000
    ? amountNumeric / 1_000_000_000
    : amountNumeric;
  if (!Number.isFinite(amountTon) || amountTon <= 0) {
    return { ok: false, error: "Indexer response missing amount" };
  }

  if (amountTon + 1e-6 < expectedAmount) {
    return { ok: false, error: "TON amount less than expected" };
  }

  const blockTime: string | undefined = typeof payload.timestamp === "string"
    ? payload.timestamp
    : payload.utime
    ? new Date(Number(payload.utime) * 1000).toISOString()
    : undefined;

  return { ok: true, amountTon, blockTime };
}

async function executeSwap(
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

async function triggerBurn(
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

async function notifyBot(message: Record<string, unknown>): Promise<void> {
  const botWebhook = optionalEnv("BOT_WEBHOOK_URL");
  if (!botWebhook) return;

  await fetch(botWebhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });
}

function resolveStakeConfig(plan: string): StakeConfig {
  return LOCK_CONFIG[plan] ?? { months: null, multiplier: 1.0 };
}

export const handler = registerHandler(async (req) => {
  const baseCors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: baseCors });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  let body: SubscriptionRequest;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON payload", undefined, req);
  }

  if (!isNumber(body.tonAmount) || body.tonAmount <= 0) {
    return bad("tonAmount must be a positive number", undefined, req);
  }

  if (!body.tonTxHash || typeof body.tonTxHash !== "string") {
    return bad("tonTxHash is required", undefined, req);
  }

  if (!body.walletAddress || typeof body.walletAddress !== "string") {
    return bad("walletAddress is required", undefined, req);
  }

  if (!body.plan) {
    return bad("plan is required", undefined, req);
  }

  let splits: SplitConfig;
  try {
    splits = validateSplits(body.splits);
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Invalid splits",
      undefined,
      req,
    );
  }

  let config: DctAppConfig;
  try {
    config = await fetchAppConfig(serviceSupabase);
  } catch (error) {
    return bad(
      error instanceof Error
        ? error.message
        : "Failed to load DCT configuration",
      undefined,
      req,
    );
  }

  const intakeWallet = config.intakeWallet ?? optionalEnv("INTAKE_WALLET");
  if (!intakeWallet) {
    return bad("Intake wallet unavailable", undefined, req);
  }

  const operationsWallet = config.operationsWallet ??
    optionalEnv("OPERATIONS_TREASURY_WALLET");
  if (!operationsWallet) {
    return bad("Operations wallet unavailable", undefined, req);
  }

  const dctMaster = config.dctMaster ?? optionalEnv("DCT_JETTON_MASTER");
  if (!dctMaster) {
    return bad("Jetton master unavailable", undefined, req);
  }

  const tonIndexerUrl = optionalEnv("TON_INDEXER_URL") ??
    config.tonIndexerUrl ?? null;

  const verification = await verifyTonPayment(
    body.tonTxHash,
    intakeWallet,
    body.tonAmount,
    tonIndexerUrl,
  );

  if (!verification.ok) {
    return bad(verification.error, undefined, req);
  }

  const tonAmount = roundTon(body.tonAmount);
  const operationsTon = roundTon((tonAmount * splits.operationsPct) / 100);
  const autoInvestTon = roundTon((tonAmount * splits.autoInvestPct) / 100);
  const burnTon = roundTon(tonAmount - operationsTon - autoInvestTon);

  let autoInvestSwap: SwapResult = {
    dctAmount: 0,
    swapTxHash: "",
    routerSwapId: "",
    priceSnapshotId: null,
    oraclePrice: null,
    usdNotional: 0,
  };
  let burnSwap: SwapResult = {
    dctAmount: 0,
    swapTxHash: "",
    routerSwapId: "",
    priceSnapshotId: null,
    oraclePrice: null,
    usdNotional: 0,
  };

  try {
    autoInvestSwap = await executeSwap(autoInvestTon, "auto-invest");
    burnSwap = await executeSwap(burnTon, "buyback-burn");
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Swap failed",
      undefined,
      req,
    );
  }

  let burnTxHash: string | null = null;
  try {
    burnTxHash = await triggerBurn(burnSwap.dctAmount, {
      tonTxHash: body.tonTxHash,
      dctMaster,
    });
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Burn hook failed",
      undefined,
      req,
    );
  }

  const supabase = serviceSupabase;

  const userPayload = {
    telegram_id: body.telegramId ?? null,
    wallet_address: body.walletAddress,
    ton_domain: body.tonDomain ?? null,
    metadata: body.metadata ?? null,
  } as Record<string, unknown>;

  const { data: user, error: userError } = await supabase
    .from("dct_users")
    .upsert(userPayload, { onConflict: "wallet_address" })
    .select()
    .single();

  if (userError) {
    return bad(`Failed to upsert user: ${userError.message}`, undefined, req);
  }

  const subscriptionId = crypto.randomUUID();
  const subscriptionRecord = {
    id: subscriptionId,
    user_id: user.id,
    plan: body.plan,
    ton_paid: tonAmount,
    operations_ton: operationsTon,
    auto_invest_ton: autoInvestTon,
    burn_ton: burnTon,
    dct_bought: roundTon(autoInvestSwap.dctAmount + burnSwap.dctAmount),
    dct_auto_invest: roundTon(autoInvestSwap.dctAmount),
    dct_burned: roundTon(burnSwap.dctAmount),
    tx_hash: body.tonTxHash,
    router_swap_id: autoInvestSwap.routerSwapId || burnSwap.routerSwapId ||
      null,
    burn_tx_hash: burnTxHash,
    split_operations_pct: splits.operationsPct,
    split_auto_invest_pct: splits.autoInvestPct,
    split_burn_pct: splits.buybackBurnPct,
    next_renewal_at: body.nextRenewalAt ?? null,
    notes: {
      source: "dct-auto-invest",
      paymentId: body.paymentId ?? null,
      verification,
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

  const { error: subscriptionError } = await supabase
    .from("dct_subscriptions")
    .insert(subscriptionRecord);

  if (subscriptionError) {
    return bad(
      `Failed to record subscription: ${subscriptionError.message}`,
      undefined,
      req,
    );
  }

  const stakeConfig = resolveStakeConfig(body.plan);
  let stakeId: string | null = null;
  if (autoInvestSwap.dctAmount > 0) {
    const weight = roundTon(autoInvestSwap.dctAmount * stakeConfig.multiplier);
    const lockUntil = stakeConfig.months
      ? addMonths(new Date(), stakeConfig.months)
      : null;
    stakeId = crypto.randomUUID();
    const { error: stakeError } = await supabase
      .from("dct_stakes")
      .insert({
        id: stakeId,
        user_id: user.id,
        subscription_id: subscriptionId,
        dct_amount: roundTon(autoInvestSwap.dctAmount),
        multiplier: stakeConfig.multiplier,
        weight,
        lock_months: stakeConfig.months,
        lock_until: lockUntil ? lockUntil.toISOString() : null,
        early_exit_penalty_bps: EARLY_EXIT_PENALTY_BPS,
        status: "active",
        notes: {
          plan: body.plan,
          tonTxHash: body.tonTxHash,
        },
      });

    if (stakeError) {
      return bad(
        `Failed to create stake: ${stakeError.message}`,
        undefined,
        req,
      );
    }
  }

  const recordedAt = new Date().toISOString();
  try {
    await publishPaymentRecordedEvent({
      subscriptionId,
      userId: user.id,
      plan: body.plan,
      tonTxHash: body.tonTxHash,
      tonAmount,
      operationsTon,
      autoInvestTon,
      burnTon,
      walletAddress: body.walletAddress,
      paymentId: body.paymentId ?? null,
      initData: body.initData ?? null,
      splits,
      autoInvestSwap: {
        dctAmount: roundTon(autoInvestSwap.dctAmount),
        swapTxHash: autoInvestSwap.swapTxHash,
        routerSwapId: autoInvestSwap.routerSwapId,
        priceSnapshotId: autoInvestSwap.priceSnapshotId,
        oraclePrice: autoInvestSwap.oraclePrice,
        usdNotional: autoInvestSwap.usdNotional,
      },
      burnSwap: {
        dctAmount: roundTon(burnSwap.dctAmount),
        swapTxHash: burnSwap.swapTxHash,
        routerSwapId: burnSwap.routerSwapId,
        priceSnapshotId: burnSwap.priceSnapshotId,
        oraclePrice: burnSwap.oraclePrice,
        usdNotional: burnSwap.usdNotional,
      },
      burnTxHash,
      metadata: body.metadata ?? null,
      stakeId,
      recordedAt,
    });
  } catch (error) {
    console.error("Failed to enqueue payment.recorded", error);
  }

  if (burnSwap.dctAmount > 0) {
    const routerSwapId = burnSwap.routerSwapId ||
      autoInvestSwap.routerSwapId ||
      null;
    try {
      await publishBurnExecutedEvent({
        subscriptionId,
        userId: user.id,
        plan: body.plan,
        tonTxHash: body.tonTxHash,
        burnTon,
        dctAmount: roundTon(burnSwap.dctAmount),
        burnTxHash,
        routerSwapId,
        paymentId: body.paymentId ?? null,
        recordedAt,
      });
    } catch (error) {
      console.error("Failed to enqueue burn.executed", error);
    }
  }

  const responsePayload = {
    ok: true,
    data: {
      userId: user.id,
      subscriptionId,
      stakeId,
      tonAmount,
      splits,
      autoInvest: {
        ton: autoInvestTon,
        dct: roundTon(autoInvestSwap.dctAmount),
        swapTxHash: autoInvestSwap.swapTxHash,
      },
      burn: {
        ton: burnTon,
        dct: roundTon(burnSwap.dctAmount),
        swapTxHash: burnSwap.swapTxHash,
        burnTxHash,
      },
      operations: {
        ton: operationsTon,
        wallet: operationsWallet,
      },
      nextRenewalAt: body.nextRenewalAt ?? null,
      processedAt: new Date().toISOString(),
    },
  };

  await notifyBot({
    type: "dct.subscription.processed",
    payload: responsePayload.data,
  }).catch(() => undefined);

  return json(responsePayload, 200, {}, req);
});

export default handler;
