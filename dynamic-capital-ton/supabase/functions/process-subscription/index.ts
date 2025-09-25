import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Plan = "vip_bronze" | "vip_silver" | "vip_gold" | "mentorship";

interface ProcessSubscriptionBody {
  telegram_id: string;
  plan: Plan;
  tx_hash: string;
  tx_boc?: string | null;
  wallet_address: string;
  ton_amount: number;
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

interface SwapResult {
  dctAmount: number;
  swapTxHash: string | null;
  routerSwapId: string | null;
}

type VerifyTonPaymentResult =
  | { ok: true; amountTON: number; payerAddress?: string; blockTime?: string }
  | { ok: false; error: string };

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

const PLAN_PRICES_TON: Record<Plan, number> = {
  vip_bronze: 120,
  vip_silver: 220,
  vip_gold: 380,
  mentorship: 550,
};

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeRouterUrl(router: string): string {
  return router.replace(/\/$/, "");
}

async function verifyTonPayment(
  txHash: string,
  expectedWallet: string,
  expectedAmount: number,
  fetchFn: typeof fetch,
  indexerUrl: string,
): Promise<VerifyTonPaymentResult> {
  const response = await fetchFn(
    `${sanitizeRouterUrl(indexerUrl)}/transactions/${txHash}`,
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

  const blockTime: string | undefined = typeof payload.timestamp === "string"
    ? payload.timestamp
    : payload.utime
    ? new Date(Number(payload.utime) * 1000).toISOString()
    : undefined;

  return { ok: true, amountTON: amountTon, payerAddress, blockTime };
}

async function dexBuyDCT(
  fetchFn: typeof fetch,
  routerUrl: string,
  tonAmount: number,
  tag: "auto-invest" | "buyback-burn",
): Promise<SwapResult> {
  if (tonAmount <= 0) {
    return { dctAmount: 0, swapTxHash: null, routerSwapId: null };
  }

  const response = await fetchFn(`${sanitizeRouterUrl(routerUrl)}/swap`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fromToken: "TON",
      toToken: "DCT",
      amountTon: tonAmount,
      tag,
    }),
  });

  if (!response.ok) {
    throw new Error(`DEX router error ${response.status}`);
  }

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  const dctAmount = Number(payload.dctAmount ?? payload.amount ?? 0);
  if (!Number.isFinite(dctAmount) || dctAmount < 0) {
    throw new Error("Router returned invalid DCT amount");
  }

  const swapTxHash = typeof payload.swapTxHash === "string"
    ? payload.swapTxHash
    : typeof payload.txHash === "string"
    ? payload.txHash
    : null;

  const routerSwapId = typeof payload.swapId === "string"
    ? payload.swapId
    : typeof payload.id === "string"
    ? payload.id
    : swapTxHash;

  return { dctAmount, swapTxHash, routerSwapId: routerSwapId ?? null };
}

async function burnDCT(
  fetchFn: typeof fetch,
  amount: number,
  context: { dctMaster: string; tonTxHash: string; swapTxHash?: string | null },
): Promise<string | null> {
  if (amount <= 0) return null;

  const webhook = Deno.env.get("BURN_WEBHOOK_URL");
  if (!webhook) return null;

  const response = await fetchFn(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      amount,
      dctMaster: context.dctMaster,
      tonTxHash: context.tonTxHash,
      swapTxHash: context.swapTxHash ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Burn webhook error ${response.status}`);
  }

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  const burnHash = payload.burnTxHash ?? payload.txHash ?? null;
  return typeof burnHash === "string" && burnHash.trim().length > 0
    ? burnHash
    : null;
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
    const {
      telegram_id,
      plan,
      tx_hash,
      tx_boc,
      wallet_address,
      ton_amount,
    } = (await req.json()) as ProcessSubscriptionBody;

    if (!telegram_id || !plan || !tx_hash || !wallet_address) {
      return new Response("Missing fields", { status: 400 });
    }

    if (typeof ton_amount !== "number" || !Number.isFinite(ton_amount) || ton_amount <= 0) {
      return new Response("Invalid TON amount", { status: 400 });
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

    const expectedAmount = PLAN_PRICES_TON[plan];
    if (!expectedAmount) {
      throw new Error(`Unsupported plan ${plan}`);
    }

    if (ton_amount + 1e-6 < expectedAmount) {
      return new Response("TON amount below plan price", { status: 400 });
    }

    const indexerUrl = Deno.env.get("TON_INDEXER_URL");
    if (!indexerUrl) {
      console.error("TON_INDEXER_URL is not configured");
      return new Response("TON indexer unavailable", { status: 500 });
    }

    const verify = await verifyTonPayment(
      tx_hash,
      config.ops_treasury,
      expectedAmount,
      deps.fetch,
      indexerUrl,
    );

    if (!verify.ok) {
      console.warn("TON payment verification failed", verify.error);
      return new Response(verify.error, { status: 400 });
    }

    const tonPaid = verify.amountTON;
    if (tonPaid + 1e-6 < ton_amount) {
      return new Response("Verified TON amount below declared value", {
        status: 400,
      });
    }

    const opsTON = (tonPaid * config.operations_pct) / 100;
    const buyTON = (tonPaid * config.autoinvest_pct) / 100;
    const burnTON = (tonPaid * config.buyback_burn_pct) / 100;

    const [autoSwap, burnSwap] = await Promise.all([
      dexBuyDCT(deps.fetch, config.dex_router, buyTON, "auto-invest"),
      dexBuyDCT(deps.fetch, config.dex_router, burnTON, "buyback-burn"),
    ]);

    const burnTxHash = await burnDCT(deps.fetch, burnSwap.dctAmount, {
      dctMaster: config.dct_master,
      tonTxHash: tx_hash,
      swapTxHash: burnSwap.swapTxHash,
    });

    const { data: userRow, error: userError } = await deps.supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !userRow) {
      throw new Error("User not found");
    }

    const user = userRow as { id: string };

    const { data: subscription, error: subError } = await deps.supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan,
        ton_paid: tonPaid,
        tx_hash,
        dct_bought: autoSwap.dctAmount + burnSwap.dctAmount,
        dct_burned: burnSwap.dctAmount,
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
      dct_amount: autoSwap.dctAmount,
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
        meta: {
          to: config.ops_treasury,
          unit: "TON",
          payer: verify.payerAddress ?? wallet_address,
          tonTxHash: tx_hash,
        },
      },
      {
        kind: "buyback",
        ref_id: subscriptionId,
        amount: buyTON,
        meta: {
          unit: "TON",
          dctOut: autoSwap.dctAmount,
          swapTxHash: autoSwap.swapTxHash,
          routerSwapId: autoSwap.routerSwapId,
        },
      },
      {
        kind: "burn",
        ref_id: subscriptionId,
        amount: burnSwap.dctAmount,
        meta: {
          unit: "DCT",
          swapTxHash: burnSwap.swapTxHash,
          routerSwapId: burnSwap.routerSwapId,
          burnTxHash,
        },
      },
      {
        kind: "stake_credit",
        ref_id: subscriptionId,
        amount: autoSwap.dctAmount,
        meta: { unit: "DCT", weight },
      },
    ]);

    if (insertLogs.error) {
      throw new Error(insertLogs.error.message);
    }

    await notifyUser(
      deps.fetch,
      `✅ *Subscription processed*\n\n• Plan: *${plan}*\n• Paid: *${tonPaid} TON*\n• Auto-invest: *${autoSwap.dctAmount} DCT*\n• Burned: *${burnSwap.dctAmount} DCT*\n\n👉 Open Mini App: ${appUrl}`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          subscriptionId,
          tonPaid,
          tonDeclared: ton_amount,
          payerWallet: verify.payerAddress ?? wallet_address,
          swaps: {
            autoInvest: autoSwap,
            burn: { ...burnSwap, burnTxHash },
          },
          burnTxHash,
          verifiedAt: verify.blockTime ?? new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          txBoc: tx_boc ?? null,
        },
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
