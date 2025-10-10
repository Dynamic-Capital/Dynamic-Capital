import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  calculateDctAmount,
  calculateTonAmount,
  fetchTonUsdRate,
  resolveDisplayPrice,
} from "../../../../supabase/functions/_shared/pricing.ts";
import { optionalEnv } from "../../../../supabase/functions/_shared/env.ts";

interface DexSwapOptions {
  routerAddress: string;
  tonAmount: number;
  tonToDctRate: number;
  fetch?: typeof fetch;
  context?: string;
}

interface DexSwapResult {
  tonAmount: number;
  dctAmount: number;
  effectiveRate: number;
}

interface BurnOptions {
  dctMaster: string;
  amount: number;
  tonAmount?: number;
  fetch?: typeof fetch;
  context?: Record<string, unknown>;
}

interface BurnResult {
  ok: true;
  txHash: string | null;
}

type Plan = "vip_bronze" | "vip_silver" | "vip_gold" | "mentorship";

interface AppConfigRow {
  operations_pct: number;
  autoinvest_pct: number;
  buyback_burn_pct: number;
  min_ops_pct: number;
  max_ops_pct: number;
  min_invest_pct: number;
  max_invest_pct: number;
  min_burn_pct: number;
  max_burn_pct: number;
  ops_treasury: string;
  dct_master: string;
  dex_router: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const announceChatId = Deno.env.get("ANNOUNCE_CHAT_ID");
const appUrl = Deno.env.get("APP_URL");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}
if (!botToken || !announceChatId) {
  throw new Error("Missing Telegram notifier configuration");
}
if (!appUrl) throw new Error("Missing APP_URL env");

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseClient>>;

let supabaseClientPromise: Promise<SupabaseClient> | null = null;

async function createSupabaseClient() {
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2"
  );
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getSupabaseClient(): Promise<SupabaseClient> {
  if (!supabaseClientPromise) {
    supabaseClientPromise = createSupabaseClient();
  }
  return supabaseClientPromise;
}

type VerifyTonPaymentResult =
  | { ok: true; amountTON: number; payerAddress?: string }
  | { ok: false; error: string; status?: number };

interface PlanPricing {
  basePrice: number;
  dynamicPrice: number | null;
  displayPrice: number;
  currency: string;
  tonAmount: number | null;
  dctAmount: number;
  pricingFormula: string | null;
  lastPricedAt: string | null;
  performanceSnapshot: Record<string, unknown> | null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeHash(value: string): string {
  return value.trim().toLowerCase().replace(/^0x/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function selectTransaction(
  payload: unknown,
  txHash: string,
): Record<string, unknown> | null {
  const normalized = normalizeHash(txHash);

  if (Array.isArray(payload)) {
    const match = payload.find((item) => {
      return isRecord(item) && typeof item.hash === "string" &&
        normalizeHash(item.hash) === normalized;
    });
    if (match && isRecord(match)) return match;
    if (payload.length === 1 && isRecord(payload[0])) {
      return payload[0];
    }
    return null;
  }

  if (!isRecord(payload)) return null;

  if (typeof payload.hash === "string") {
    if (!normalized || normalizeHash(payload.hash) === normalized) {
      return payload;
    }
  }

  const transactions = (payload as Record<string, unknown>).transactions;
  if (Array.isArray(transactions)) {
    const match = transactions.find((item) => {
      return isRecord(item) && typeof item.hash === "string" &&
        normalizeHash(item.hash) === normalized;
    });
    if (match && isRecord(match)) return match;
    if (transactions.length === 1 && isRecord(transactions[0])) {
      return transactions[0];
    }
  }

  const nestedKeys = ["transaction", "result", "data"] as const;
  for (const key of nestedKeys) {
    if (key in payload) {
      const nested = selectTransaction(
        (payload as Record<string, unknown>)[key],
        txHash,
      );
      if (nested) return nested;
    }
  }

  return null;
}

function unwrapAddress(candidate: unknown): string | undefined {
  if (typeof candidate === "string" && candidate.trim() !== "") {
    return candidate;
  }

  if (!isRecord(candidate)) return undefined;

  if (
    typeof candidate.address === "string" && candidate.address.trim() !== ""
  ) {
    return candidate.address;
  }

  const nestedKeys = [
    "account",
    "destination",
    "source",
    "wallet",
    "owner",
    "addr",
  ] as const;

  for (const key of nestedKeys) {
    if (key in candidate) {
      const nested = unwrapAddress(candidate[key]);
      if (nested) return nested;
    }
  }

  return undefined;
}

function pickAddress(...candidates: Array<unknown>): string | undefined {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const addr = unwrapAddress(item);
        if (addr) return addr;
      }
      continue;
    }

    const addr = unwrapAddress(candidate);
    if (addr) return addr;
  }

  return undefined;
}

function extractNumericValue(candidate: unknown): number | null {
  if (typeof candidate === "bigint") {
    return Number(candidate);
  }

  const direct = parseNumber(candidate);
  if (direct !== null) return direct;

  if (!isRecord(candidate)) return null;

  const nestedKeys = [
    "value",
    "amount",
    "coins",
    "credit",
    "nanoton",
    "ton",
  ] as const;
  for (const key of nestedKeys) {
    if (key in candidate) {
      const nested = extractNumericValue(candidate[key]);
      if (nested !== null) return nested;
    }
  }

  return null;
}

const NANO_IN_TON = 1_000_000_000;

type TonAmountScale = "ton" | "nanoton";

function normalizeTonAmount(
  value: unknown,
  scale: TonAmountScale,
): number | null {
  const numeric = extractNumericValue(value);
  if (numeric === null) return null;

  const resolved = scale === "nanoton" ? numeric / NANO_IN_TON : numeric;

  return Number.isFinite(resolved) && resolved > 0 ? resolved : null;
}

function pickTonAmount(
  candidates: Array<{ value: unknown; scale: TonAmountScale }>,
): number | null {
  for (const candidate of candidates) {
    const amount = normalizeTonAmount(candidate.value, candidate.scale);
    if (amount !== null) {
      return amount;
    }
  }
  return null;
}

async function fetchPlanPricing(
  supabase: SupabaseClient,
  planId: string,
  tonRate: number | null,
): Promise<PlanPricing> {
  const planFields = [
    "id",
    "price",
    "currency",
    "dynamic_price_usdt",
    "pricing_formula",
    "last_priced_at",
    "performance_snapshot",
  ].join(",");

  const { data, error } = await supabase
    .from("subscription_plans")
    .select(planFields)
    .eq("id", planId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Subscription plan not found");
  }

  const basePrice = Number(data.price ?? 0);
  const dynamicPrice = parseNumber(data.dynamic_price_usdt);
  const { price: displayPrice } = resolveDisplayPrice(
    basePrice,
    dynamicPrice ?? null,
  );
  const snapshot = (data.performance_snapshot ?? null) as
    | Record<string, unknown>
    | null;
  const snapshotTon = snapshot && typeof snapshot.ton_amount === "number"
    ? snapshot.ton_amount
    : null;
  const snapshotDct = snapshot && typeof snapshot.dct_amount === "number"
    ? snapshot.dct_amount
    : null;
  const tonAmount = snapshotTon ?? calculateTonAmount(displayPrice, tonRate);
  const dctAmount = snapshotDct ?? calculateDctAmount(displayPrice);

  return {
    basePrice,
    dynamicPrice: dynamicPrice ?? null,
    displayPrice,
    currency: data.currency ?? "USD",
    tonAmount,
    dctAmount,
    pricingFormula: data.pricing_formula ?? null,
    lastPricedAt: data.last_priced_at ?? null,
    performanceSnapshot: snapshot,
  };
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

export async function verifyTonPayment(
  txHash: string,
  expectedWallet: string,
  expectedAmount: number,
  fetchFn: typeof fetch,
): Promise<VerifyTonPaymentResult> {
  const indexerUrl = Deno.env.get("TON_INDEXER_URL");
  if (!indexerUrl) {
    return {
      ok: false,
      error: "TON indexer unavailable",
      status: 503,
    };
  }

  const response = await fetchFn(
    `${indexerUrl.replace(/\/$/, "")}/transactions/${txHash}`,
  );

  if (!response.ok) {
    return { ok: false, error: `Indexer returned ${response.status}` };
  }

  const payload = await response.json();
  const transaction = selectTransaction(payload, txHash);
  if (!transaction) {
    return { ok: false, error: "Indexer response missing transaction" };
  }

  const account = transaction["account"] as Record<string, unknown> | undefined;
  const inMsg = transaction["in_msg"] as Record<string, unknown> | undefined;
  const outMsg = transaction["out_msg"] as Record<string, unknown> | undefined;
  const outMsgs = transaction["out_msgs"] as unknown;

  const destination = pickAddress(
    transaction["destination"],
    account,
    account?.["address"],
    inMsg?.["destination"],
    outMsg?.["destination"],
    outMsgs,
  );

  if (!destination) {
    return { ok: false, error: "Indexer response missing destination" };
  }

  const expectedNormalized = normalizeAddress(expectedWallet);
  if (normalizeAddress(destination) !== expectedNormalized) {
    return { ok: false, error: "Funds not received by intake wallet" };
  }

  const creditPhase = transaction["credit_phase"] as
    | Record<string, unknown>
    | undefined;

  const amountTon = pickTonAmount([
    { value: transaction["amountTon"], scale: "ton" },
    { value: transaction["amount"], scale: "nanoton" },
    { value: transaction["value"], scale: "nanoton" },
    { value: transaction["coins"], scale: "nanoton" },
    { value: inMsg?.["value"], scale: "nanoton" },
    { value: inMsg?.["amount"], scale: "nanoton" },
    { value: creditPhase?.["credit"], scale: "nanoton" },
  ]);

  if (amountTon === null) {
    return { ok: false, error: "Indexer response missing amount" };
  }

  if (!Number.isFinite(amountTon) || amountTon <= 0) {
    return { ok: false, error: "Indexer response missing amount" };
  }

  if (amountTon + 1e-6 < expectedAmount) {
    return { ok: false, error: "TON amount less than expected" };
  }

  const payerAddress = pickAddress(
    transaction["source"],
    inMsg?.["source"],
    outMsg?.["source"],
    transaction["sender"],
  );

  return { ok: true, amountTON: amountTon, payerAddress };
}

function roundAmount(value: number, decimals = 9): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(decimals));
}

async function dexBuyDCT(options: DexSwapOptions): Promise<DexSwapResult> {
  const { tonAmount, tonToDctRate } = options;
  const roundedTon = roundAmount(Math.max(tonAmount, 0));

  if (roundedTon <= 0) {
    return { tonAmount: 0, dctAmount: 0, effectiveRate: tonToDctRate };
  }

  const dctAmount = roundAmount(roundedTon * tonToDctRate);
  return {
    tonAmount: roundedTon,
    dctAmount,
    effectiveRate: tonToDctRate,
  };
}

async function burnDCT(options: BurnOptions): Promise<BurnResult> {
  const amount = roundAmount(Math.max(options.amount, 0));
  const tonAmount = roundAmount(Math.max(options.tonAmount ?? 0, 0));

  if (amount <= 0) {
    return { ok: true, txHash: null };
  }

  const webhook = optionalEnv("BURN_WEBHOOK_URL");
  if (!webhook) {
    return { ok: true, txHash: null };
  }

  const fetchImpl = options.fetch ?? defaultFetch;
  const response = await fetchImpl(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      amount,
      dctMaster: options.dctMaster,
      tonAmount,
      context: options.context ?? {},
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      detail
        ? `Burn webhook error ${response.status}: ${detail}`
        : `Burn webhook error ${response.status}`,
    );
  }

  const payload = await response.json().catch(
    () => ({} as Record<string, unknown>),
  );
  const txHash = typeof payload.txHash === "string"
    ? payload.txHash
    : typeof payload.burnTxHash === "string"
    ? payload.burnTxHash
    : null;

  return { ok: true, txHash };
}

async function notifyUser(fetchFn: typeof fetch, text: string) {
  const response = await fetchFn(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: announceChatId,
        text,
        parse_mode: "Markdown",
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to notify user", response.status, errorBody);
  }
}

function assertBounds(value: number, min: number, max: number, label: string) {
  if (value < min || value > max) {
    throw new Error(`${label} out of bounds`);
  }
}

function getStakeMeta(plan: Plan) {
  switch (plan) {
    case "vip_gold":
      return { lockMonths: 12, weight: 2.0 };
    case "vip_silver":
      return { lockMonths: 6, weight: 1.5 };
    case "mentorship":
      return { lockMonths: 3, weight: 1.2 };
    case "vip_bronze":
    default:
      return { lockMonths: 3, weight: 1.2 };
  }
}

interface Dependencies {
  supabase?: SupabaseClient;
  fetch?: typeof fetch;
  dexSwap?: (options: DexSwapOptions) => Promise<DexSwapResult>;
  burn?: (options: BurnOptions) => Promise<BurnResult>;
}

const defaultFetch = globalThis.fetch.bind(globalThis);

interface ParsedRequest {
  telegram_id: string;
  plan: Plan;
  tx_hash: string;
}

function isParsedRequest(value: unknown): value is ParsedRequest {
  if (!isRecord(value)) return false;
  const { telegram_id, plan, tx_hash } = value as Record<string, unknown>;
  return typeof telegram_id === "string" && telegram_id.trim() !== "" &&
    typeof plan === "string" &&
    typeof tx_hash === "string" && tx_hash.trim() !== "";
}

async function parseRequest(req: Request): Promise<ParsedRequest | null> {
  try {
    const payload = await req.json();
    if (isParsedRequest(payload)) {
      const validPlans: Array<Plan> = [
        "vip_bronze",
        "vip_silver",
        "vip_gold",
        "mentorship",
      ];
      if (!validPlans.includes(payload.plan as Plan)) {
        return null;
      }
      return {
        telegram_id: payload.telegram_id.trim(),
        plan: payload.plan as Plan,
        tx_hash: payload.tx_hash.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function assertPercentSum(config: AppConfigRow) {
  const total = config.operations_pct + config.autoinvest_pct +
    config.buyback_burn_pct;
  const tolerance = 1e-6;
  if (Math.abs(total - 100) > tolerance) {
    throw new Error("Split percentages must sum to 100");
  }
}

interface TonSplits {
  operations: number;
  autoInvest: number;
  burn: number;
}

function calculateTonSplits(tonPaid: number, config: AppConfigRow): TonSplits {
  const operations = roundAmount((tonPaid * config.operations_pct) / 100);
  const autoInvest = roundAmount((tonPaid * config.autoinvest_pct) / 100);
  const burn = roundAmount((tonPaid * config.buyback_burn_pct) / 100);

  const allocated = operations + autoInvest + burn;
  const delta = roundAmount(tonPaid - allocated);

  if (Math.abs(delta) > 1e-6) {
    const adjustedOperations = roundAmount(operations + delta);
    if (adjustedOperations < 0) {
      throw new Error("Invalid TON split calculation");
    }
    return {
      operations: adjustedOperations,
      autoInvest,
      burn,
    };
  }

  return { operations, autoInvest, burn };
}

export async function handler(
  req: Request,
  deps: Dependencies = {},
): Promise<Response> {
  try {
    const supabase = deps.supabase ?? (await getSupabaseClient());
    const fetchImpl = deps.fetch ?? defaultFetch;

    const parsed = await parseRequest(req);
    if (!parsed) {
      return new Response("Invalid request body", { status: 400 });
    }

    const { telegram_id, plan, tx_hash } = parsed;

    const { data: cfg, error: cfgError } = await supabase
      .from("app_config")
      .select("*")
      .eq("id", 1)
      .single();

    if (cfgError || !cfg) {
      throw new Error(cfgError?.message ?? "Config not found");
    }

    const config = cfg as AppConfigRow;

    assertBounds(
      config.operations_pct,
      config.min_ops_pct,
      config.max_ops_pct,
      "Ops split",
    );
    assertBounds(
      config.autoinvest_pct,
      config.min_invest_pct,
      config.max_invest_pct,
      "Invest split",
    );
    assertBounds(
      config.buyback_burn_pct,
      config.min_burn_pct,
      config.max_burn_pct,
      "Burn split",
    );
    assertPercentSum(config);

    const tonRate = await fetchTonUsdRate(fetchImpl);
    const planPricing = await fetchPlanPricing(supabase, plan, tonRate.rate);

    if (planPricing.currency !== "USD" && planPricing.currency !== "USDT") {
      throw new Error(`Unsupported currency ${planPricing.currency}`);
    }

    if (planPricing.tonAmount === null) {
      const message = {
        ok: false,
        error: "TON pricing temporarily unavailable. Please retry shortly.",
      };
      return new Response(JSON.stringify(message), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const expectedTonAmount = planPricing.tonAmount;

    if (!Number.isFinite(expectedTonAmount) || expectedTonAmount <= 0) {
      throw new Error("Unable to determine TON price for plan");
    }

    const verify = await verifyTonPayment(
      tx_hash,
      config.ops_treasury,
      expectedTonAmount,
      fetchImpl,
    );

    if (!verify.ok) {
      const status = verify.status ?? 400;
      const log = status >= 500 ? console.error : console.warn;
      log("TON payment verification failed", verify.error);
      return new Response(verify.error, { status });
    }

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !userRow) {
      throw new Error("User not found");
    }

    const user = userRow as { id: string };

    const { data: walletRow, error: walletError } = await supabase
      .from("wallets")
      .select("address")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      throw new Error(walletError.message);
    }

    const linkedAddress = walletRow?.address as string | undefined;

    if (!linkedAddress) {
      console.warn("User has no linked wallet", { userId: user.id });
      return new Response("Linked wallet required", { status: 400 });
    }

    const payerAddress = verify.payerAddress;

    if (!payerAddress) {
      console.warn("Missing payer address from TON verification", {
        userId: user.id,
        tx_hash,
      });
      return new Response("Unable to validate payer wallet", { status: 400 });
    }

    if (
      normalizeAddress(linkedAddress) !== normalizeAddress(payerAddress)
    ) {
      console.warn("Payer wallet mismatch", {
        userId: user.id,
        linkedAddress,
        payerAddress,
      });
      return new Response("Payer wallet does not match linked wallet", {
        status: 400,
      });
    }

    const tonPaid = roundAmount(verify.amountTON);
    const splits = calculateTonSplits(tonPaid, config);
    const opsTON = splits.operations;
    const buyTON = splits.autoInvest;
    const burnTON = splits.burn;

    const tonToDctRate = (() => {
      if (planPricing.tonAmount && planPricing.tonAmount > 0) {
        const ratio = planPricing.dctAmount / planPricing.tonAmount;
        if (Number.isFinite(ratio) && ratio > 0) {
          return ratio;
        }
      }
      if (tonRate.rate && tonRate.rate > 0) {
        return tonRate.rate;
      }
      throw new Error("Unable to determine TON→DCT conversion rate");
    })();

    const dexSwap = deps.dexSwap ?? dexBuyDCT;
    const burnFn = deps.burn ?? burnDCT;

    const swapTasks: Array<
      Promise<{
        kind: "auto-invest" | "burn";
        result: DexSwapResult;
      }>
    > = [];

    if (buyTON > 0) {
      swapTasks.push(
        dexSwap({
          routerAddress: config.dex_router,
          tonAmount: buyTON,
          tonToDctRate,
          fetch: fetchImpl,
          context: "auto-invest",
        }).then((result) => ({ kind: "auto-invest", result })),
      );
    }

    if (burnTON > 0) {
      swapTasks.push(
        dexSwap({
          routerAddress: config.dex_router,
          tonAmount: burnTON,
          tonToDctRate,
          fetch: fetchImpl,
          context: "burn",
        }).then((result) => ({ kind: "burn", result })),
      );
    }

    const swapResults = await Promise.all(swapTasks);
    let autoInvestSwap: DexSwapResult = {
      tonAmount: buyTON,
      dctAmount: 0,
      effectiveRate: tonToDctRate,
    };
    let burnSwap: DexSwapResult = {
      tonAmount: burnTON,
      dctAmount: 0,
      effectiveRate: tonToDctRate,
    };

    for (const swap of swapResults) {
      if (swap.kind === "auto-invest") {
        autoInvestSwap = swap.result;
      } else {
        burnSwap = swap.result;
      }
    }

    const dctForUser = autoInvestSwap.dctAmount;
    const dctForBurn = burnSwap.dctAmount;

    const burnResult = dctForBurn > 0
      ? await burnFn({
        dctMaster: config.dct_master,
        amount: dctForBurn,
        tonAmount: burnSwap.tonAmount,
        fetch: fetchImpl,
        context: {
          payerAddress,
          txHash: tx_hash,
        },
      })
      : { ok: true as const, txHash: null };

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan,
        ton_paid: tonPaid,
        tx_hash,
        dct_bought: dctForUser,
        dct_burned: dctForBurn,
        ops_ton: opsTON,
        status: "completed",
      })
      .select()
      .single();

    if (subError || !subscription) {
      throw new Error(subError?.message ?? "Failed to persist subscription");
    }

    const subscriptionId = (subscription as { id: string }).id;

    const { lockMonths, weight } = getStakeMeta(plan);
    const lockUntil = new Date();
    lockUntil.setMonth(lockUntil.getMonth() + lockMonths);

    const { error: stakeError } = await supabase.from("stakes").insert({
      user_id: user.id,
      dct_amount: dctForUser,
      lock_until: lockUntil.toISOString(),
      weight,
    });

    if (stakeError) {
      throw new Error(stakeError.message);
    }

    const insertLogs = await supabase.from("tx_logs").insert([
      {
        kind: "ops_transfer",
        ref_id: subscriptionId,
        amount: opsTON,
        meta: { to: config.ops_treasury, unit: "TON" },
      },
      {
        kind: "buyback",
        ref_id: subscriptionId,
        amount: buyTON,
        meta: {
          unit: "TON",
          dctOut: dctForUser,
          rate: autoInvestSwap.effectiveRate,
        },
      },
      {
        kind: "burn",
        ref_id: subscriptionId,
        amount: dctForBurn,
        meta: {
          unit: "DCT",
          tonSpent: burnSwap.tonAmount,
          rate: burnSwap.effectiveRate,
          txHash: burnResult.txHash,
        },
      },
      {
        kind: "stake_credit",
        ref_id: subscriptionId,
        amount: dctForUser,
        meta: { unit: "DCT", weight },
      },
    ]);

    if (insertLogs.error) {
      throw new Error(insertLogs.error.message);
    }

    await notifyUser(
      fetchImpl,
      `✅ *Subscription processed*\n\n• Plan: *${plan}*\n• Paid: *${
        tonPaid.toFixed(3)
      } TON* (~$${planPricing.displayPrice.toFixed(2)})\n• Auto-invest: *${
        dctForUser.toFixed(2)
      } DCT*\n• Burned: *${
        dctForBurn.toFixed(2)
      } DCT*\n\n👉 Open Mini App: ${appUrl}`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        price_usd: planPricing.displayPrice,
        ton_expected: expectedTonAmount,
        ton_paid: tonPaid,
        dct_auto_invest: dctForUser,
        dct_burned: dctForBurn,
        ton_rate: tonRate,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
}

if (import.meta.main) {
  serve((req) => handler(req));
}
