import { createClient } from "../_shared/client.ts";
import { corsHeaders, json, methodNotAllowed, ok } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import {
  buildFundTransparency,
  type EmissionRow,
  type FundCycleRow,
  type PaymentIntentRow,
  type SubscriptionRow,
} from "./metrics.ts";

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(req, "GET,POST,OPTIONS"),
    });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return methodNotAllowed(req);
  }

  try {
    const supabase = createClient("service");

    const [subscriptions, fundCycles, paymentIntents, emissions] = await Promise
      .all([
        supabase.from("dct_subscriptions").select<SubscriptionRow>(
          "dct_bought,dct_auto_invest,dct_burned",
        ),
        supabase.from("fund_cycles").select<FundCycleRow>(
          "cycle_year,cycle_month,profit_total_usdt,reinvested_total_usdt,investor_payout_usdt",
        ),
        supabase.from("payment_intents").select<PaymentIntentRow>(
          "user_id,status",
        ),
        supabase.from("dct_emissions").select<EmissionRow>(
          "epoch,total_reward",
        ),
      ]);

    const errors = [
      subscriptions.error,
      fundCycles.error,
      paymentIntents.error,
      emissions.error,
    ]
      .filter(Boolean);
    if (errors.length > 0) {
      console.error("fund-transparency query errors", errors);
      return json(
        { ok: false, error: "Failed to load transparency data" },
        500,
        {},
        req,
      );
    }

    const metrics = buildFundTransparency({
      subscriptions: subscriptions.data ?? [],
      fundCycles: fundCycles.data ?? [],
      paymentIntents: paymentIntents.data ?? [],
      emissions: emissions.data ?? [],
    });

    return ok({ data: metrics }, req);
  } catch (error) {
    console.error("fund-transparency handler error", error);
    return json({ ok: false, error: "Unexpected error" }, 500, {}, req);
  }
});

export default handler;
