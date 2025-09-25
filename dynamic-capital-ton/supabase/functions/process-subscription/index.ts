import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function verifyTonPayment(
  txHash: string,
): Promise<{ ok: boolean; amountTON: number; payerAddress: string }> {
  console.log("verifyTonPayment placeholder", txHash);
  return { ok: true, amountTON: 10.0, payerAddress: "EQ_demo_address" };
}

async function dexBuyDCT(
  _routerAddr: string,
  tonAmount: number,
): Promise<{ dctAmount: number }> {
  console.log("dexBuyDCT placeholder", tonAmount);
  return { dctAmount: tonAmount * 100 };
}

async function burnDCT(_dctMaster: string, amount: number) {
  console.log("burnDCT placeholder", amount);
  return true;
}

async function notifyUser(text: string) {
  const response = await fetch(
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

serve(async (req) => {
  try {
    const { telegram_id, plan, tx_hash } =
      (await req.json()) as ProcessSubscriptionBody;

    if (!telegram_id || !plan || !tx_hash) {
      return new Response("Missing fields", { status: 400 });
    }

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

    const verify = await verifyTonPayment(tx_hash);
    if (!verify.ok) {
      return new Response("Invalid tx", { status: 400 });
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

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !userRow) {
      throw new Error("User not found");
    }

    const user = userRow as { id: string };

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
      `✅ *Subscription processed*\n\n• Plan: *${plan}*\n• Paid: *${tonPaid} TON*\n• Auto-invest: *${dctForUser} DCT*\n• Burned: *${dctForBurn} DCT*\n\n👉 Open Mini App: ${appUrl}`,
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(message, { status: 500 });
  }
});
