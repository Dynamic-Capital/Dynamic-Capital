import { createClient, createClientForRequest } from "../_shared/client.ts";
import { corsHeaders, json, mna, oops } from "../_shared/http.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";
import { version } from "../_shared/version.ts";
import { getContent, getCryptoDepositAddress } from "../_shared/config.ts";
import { resolveDisplayPrice } from "../_shared/pricing.ts";
import { registerHandler } from "../_shared/serve.ts";

interface CheckoutRequest {
  plan_id?: string;
  method?: "bank_transfer" | "crypto";
  currency?: string;
  amount?: number;
  telegram_id?: string;
  initData?: string;
  metadata?: Record<string, unknown> | null;
  source?: string | null;
}

interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
  is_active?: boolean;
}

type CheckoutInstructions =
  | { type: "bank_transfer"; banks: BankAccount[]; note?: string | null }
  | { type: "crypto"; address: string; note: string };

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function sanitizeCurrency(input?: string | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
}

function normalizeAmount(amount?: number | null): number | null {
  if (typeof amount !== "number") return null;
  if (!Number.isFinite(amount)) return null;
  if (amount <= 0) return null;
  return Number(amount.toFixed(2));
}

export async function handler(req: Request): Promise<Response> {
  const headers = corsHeaders(req, "POST,OPTIONS");
  const ver = version(req, "create-checkout");
  if (ver) return ver;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return mna();
  }

  let payload: CheckoutRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, {}, req);
  }

  if (!payload?.plan_id || !payload?.method) {
    return json({ ok: false, error: "missing_fields" }, 400, {}, req);
  }

  if (payload.method !== "bank_transfer" && payload.method !== "crypto") {
    return json({ ok: false, error: "unsupported_method" }, 400, {}, req);
  }

  const authHeader = req.headers.get("Authorization");
  let telegramId: string | null = null;

  if (authHeader) {
    try {
      const supaAuth = createClientForRequest(req, {
        auth: { persistSession: false },
      });
      const { data: { user } } = await supaAuth.auth.getUser();
      if (user) {
        telegramId = user.user_metadata?.telegram_id || user.id;
      }
    } catch (error) {
      console.warn("[create-checkout] auth lookup failed", error);
    }
  }

  if (!telegramId && payload.initData) {
    try {
      const valid = await verifyInitData(payload.initData);
      if (valid) {
        const params = new URLSearchParams(payload.initData);
        const user = JSON.parse(params.get("user") || "{}");
        telegramId = String(user.id || "");
      } else {
        return json(
          { ok: false, error: "invalid_telegram_data" },
          401,
          {},
          req,
        );
      }
    } catch (error) {
      console.error("[create-checkout] initData verification failed", error);
      return json(
        { ok: false, error: "telegram_verification_failed" },
        401,
        {},
        req,
      );
    }
  }

  if (!telegramId && payload.telegram_id) {
    telegramId = String(payload.telegram_id);
  }

  if (!telegramId) {
    return json({ ok: false, error: "unauthorized" }, 401, {}, req);
  }

  const supa = createClient("service");

  const { data: userRow, error: userLookupError } = await supa
    .from("bot_users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userLookupError) {
    console.error("[create-checkout] bot_users lookup error", userLookupError);
  }

  let userId = userRow?.id as string | undefined;
  if (!userId) {
    const { data: inserted, error: insertUserError } = await supa
      .from("bot_users")
      .insert({ telegram_id: telegramId })
      .select("id")
      .single();
    if (insertUserError) {
      console.error(
        "[create-checkout] bot_users insert failed",
        insertUserError,
      );
      return oops("failed_to_resolve_user", insertUserError.message, req);
    }
    userId = inserted?.id as string | undefined;
  }

  if (!userId) {
    return oops("user_not_found", undefined, req);
  }

  const { data: plan, error: planError } = await supa
    .from("subscription_plans")
    .select(
      "id,name,price,currency,dynamic_price_usdt,is_lifetime,performance_snapshot",
    )
    .eq("id", payload.plan_id)
    .maybeSingle();

  if (planError) {
    console.error("[create-checkout] plan lookup error", planError);
    return oops("plan_lookup_failed", planError.message, req);
  }

  if (!plan) {
    return json({ ok: false, error: "plan_not_found" }, 404, {}, req);
  }

  const basePrice = coerceNumber(plan.price) ?? 0;
  const dynamicPrice = coerceNumber(plan.dynamic_price_usdt);
  const { price: defaultPrice, dynamicApplied } = resolveDisplayPrice(
    basePrice,
    dynamicPrice,
  );

  const amount = normalizeAmount(payload.amount) ?? defaultPrice;
  const currency = sanitizeCurrency(payload.currency) ||
    sanitizeCurrency(plan.currency) || "USD";

  const webhookData: Record<string, unknown> = {
    source: payload.source || "create-checkout",
    metadata: payload.metadata ?? null,
    plan_snapshot: {
      id: plan.id,
      name: plan.name,
      base_price: basePrice,
      dynamic_price_usdt: dynamicPrice,
      dynamic_price_applied: dynamicApplied,
      is_lifetime: plan.is_lifetime ?? false,
      performance_snapshot: plan.performance_snapshot ?? null,
    },
    requested: {
      amount,
      currency,
      method: payload.method,
    },
  };

  const { data: payment, error: paymentError } = await supa
    .from("payments")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      amount,
      currency,
      payment_method: payload.method,
      status: "pending",
      webhook_data: webhookData,
    })
    .select("id,created_at")
    .single();

  if (paymentError || !payment) {
    console.error("[create-checkout] payment insert failed", paymentError);
    return oops("payment_creation_failed", paymentError?.message, req);
  }

  let instructions: CheckoutInstructions;
  if (payload.method === "bank_transfer") {
    const { data: banks, error: bankError } = await supa
      .from("bank_accounts")
      .select(
        "bank_name,account_name,account_number,currency,is_active",
      )
      .eq("is_active", true)
      .order("display_order");

    if (bankError) {
      console.error("[create-checkout] bank account lookup failed", bankError);
      return oops("bank_accounts_unavailable", bankError.message, req);
    }

    const filtered = (banks as BankAccount[] || []).filter((bank) => {
      if (!bank.currency) return true;
      return bank.currency.toUpperCase() === currency;
    });

    const instructionsNote = await getContent<string>("payment_instructions");

    instructions = {
      type: "bank_transfer",
      banks: filtered,
      note: instructionsNote || null,
    };
  } else {
    const cryptoAddress = await getCryptoDepositAddress();
    if (!cryptoAddress) {
      return oops("crypto_address_not_configured", undefined, req);
    }
    instructions = {
      type: "crypto",
      address: cryptoAddress,
      note:
        "Send USDT (TRC20) to the provided address. Upload your transaction receipt after payment.",
    };
  }

  return json(
    {
      ok: true,
      payment_id: payment.id,
      plan: {
        id: plan.id,
        name: plan.name,
        amount,
        currency,
        dynamic_price_applied: dynamicApplied,
      },
      instructions,
    },
    200,
    {},
    req,
  );
}

registerHandler(handler);
export default handler;
