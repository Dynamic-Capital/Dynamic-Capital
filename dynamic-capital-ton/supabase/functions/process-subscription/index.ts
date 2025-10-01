import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateDctAmount,
  calculateTonAmount,
  fetchTonUsdRate,
  resolveDisplayPrice,
} from "../../../../supabase/functions/_shared/pricing.ts";

type Plan = "vip_bronze" | "vip_silver" | "vip_gold" | "mentorship";

interface ProcessSubscriptionBody {
  telegram_id: string;
  plan: Plan;
  tx_hash: string;
}

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

const supabase = createClient(supabaseUrl, supabaseServiceKey);
type SupabaseClient = typeof supabase;

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
  const destination: string | undefined = payload.destination ??
    payload.account?.address ??
    payload.in_msg?.destination ??
    payload.out_msg?.destination;

  if (!destination) {
    return { ok: false, error: "Indexer response missing destination" };
  }

  if (
    normalizeAddress(String(destination)) !==
      normalizeAddress(expectedWallet)
  ) {
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

  const payerCandidate = payload.source ?? payload.account?.address ??
    payload.in_msg?.source ?? payload.out_msg?.source ?? payload.sender;

  const payerAddress = typeof payerCandidate === "string"
    ? payerCandidate
    : undefined;

  return { ok: true, amountTON: amountTon, payerAddress };
}

function dexBuyDCT(
  _routerAddr: string,
  tonAmount: number,
): Promise<{ dctAmount: number }> {
  console.log("dexBuyDCT placeholder", tonAmount);
  return Promise.resolve({ dctAmount: tonAmount * 100 });
}

function burnDCT(_dctMaster: string, amount: number) {
  console.log("burnDCT placeholder", amount);
  return Promise.resolve(true);
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
  supabase: SupabaseClient;
  fetch: typeof fetch;
}

const defaultDeps: Dependencies = {
  supabase,
  fetch: globalThis.fetch.bind(globalThis),
};

export async function handler(
  req: Request,
  deps: Dependencies = defaultDeps,
): Promise<Response> {
  try {
    const { telegram_id, plan, tx_hash } =
      (await req.json()) as ProcessSubscriptionBody;

    if (!telegram_id || !plan || !tx_hash) {
      return new Response("Missing fields", { status: 400 });
    }

    const { data: cfg, error: cfgError } = await deps.supabase
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

    const tonRate = await fetchTonUsdRate(deps.fetch);
    const planPricing = await fetchPlanPricing(
      deps.supabase,
      plan,
      tonRate.rate,
    );

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
      deps.fetch,
    );

    if (!verify.ok) {
      const status = verify.status ?? 400;
      const log = status >= 500 ? console.error : console.warn;
      log("TON payment verification failed", verify.error);
      return new Response(verify.error, { status });
    }

    const { data: userRow, error: userError } = await deps.supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !userRow) {
      throw new Error("User not found");
    }

    const user = userRow as { id: string };

    const { data: walletRow, error: walletError } = await deps.supabase
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

    const tonPaid = verify.amountTON;
    const opsTON = (tonPaid * config.operations_pct) / 100;
    const buyTON = (tonPaid * config.autoinvest_pct) / 100;
    const burnTON = (tonPaid * config.buyback_burn_pct) / 100;

    const [{ dctAmount: dctForUser }, { dctAmount: dctForBurn }] = await Promise
      .all([
        dexBuyDCT(config.dex_router, buyTON),
        dexBuyDCT(config.dex_router, burnTON),
      ]);

    await burnDCT(config.dct_master, dctForBurn);

    const { data: subscription, error: subError } = await deps.supabase
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

    const { error: stakeError } = await deps.supabase.from("stakes").insert({
      user_id: user.id,
      dct_amount: dctForUser,
      lock_until: lockUntil.toISOString(),
      weight,
    });

    if (stakeError) {
      throw new Error(stakeError.message);
    }

    const insertLogs = await deps.supabase.from("tx_logs").insert([
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
        meta: { unit: "TON", dctOut: dctForUser },
      },
      {
        kind: "burn",
        ref_id: subscriptionId,
        amount: dctForBurn,
        meta: { unit: "DCT" },
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
      deps.fetch,
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
