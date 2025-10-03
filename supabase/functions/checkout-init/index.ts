import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, createClientForRequest } from "../_shared/client.ts";
import { bad, json, mna, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";
import { getCryptoDepositAddress } from "../_shared/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  telegram_id?: string;
  plan_id: string;
  method: "bank_transfer" | "crypto";
  currency?: string;
  amount?: number;
  initData?: string;
};

type BankAccount = {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
  is_active: boolean;
};

type BankInstructions = { type: "bank_transfer"; banks: BankAccount[] };
type CryptoInstructions = { type: "crypto"; address: string; note: string };
type Instructions = BankInstructions | CryptoInstructions;

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const v = version(req, "checkout-init");
  if (v) return v;
  if (req.method !== "POST") {
    return mna();
  }

  const authHeader = req.headers.get("Authorization");
  let telegramId: string | null = null;

  if (authHeader) {
    // Web user authentication
    const supaAuth = createClientForRequest(req, {
      auth: { persistSession: false },
    });
    const { data: { user } } = await supaAuth.auth.getUser();
    if (user) {
      telegramId = user.user_metadata?.telegram_id || user.id;
    }
  }
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("Bad JSON");
  }

  // If no auth header, try Telegram initData verification
  if (!telegramId && body.initData) {
    try {
      const valid = await verifyInitData(body.initData);
      if (valid) {
        const params = new URLSearchParams(body.initData);
        const user = JSON.parse(params.get("user") || "{}");
        telegramId = String(user.id || "");
        console.log("Telegram initData verified for user:", telegramId);
      } else {
        console.warn("Invalid Telegram initData provided");
        return json({ error: "invalid_telegram_data" }, 401, corsHeaders);
      }
    } catch (err) {
      console.error("Error verifying Telegram initData:", err);
      return json({ error: "telegram_verification_failed" }, 401, corsHeaders);
    }
  }

  // Use telegram_id from auth, initData, or body
  const finalTelegramId = telegramId || body.telegram_id;
  if (!finalTelegramId) {
    return json({ error: "unauthorized" }, 401, corsHeaders);
  }

  const supa = createClient();
  const { data: bu } = await supa
    .from("bot_users")
    .select("id")
    .eq("telegram_id", finalTelegramId)
    .limit(1);
  let userId = bu?.[0]?.id as string | undefined;
  if (!userId) {
    const { data: ins } = await supa
      .from("bot_users")
      .insert({ telegram_id: finalTelegramId })
      .select("id")
      .single();
    userId = ins?.id;
  }
  if (!userId) {
    return oops("user_not_found");
  }

  const { data: pay, error: perr } = await supa
    .from("payments")
    .insert({
      user_id: userId,
      plan_id: body.plan_id,
      amount: body.amount || null,
      currency: body.currency || "USD",
      payment_method: body.method,
      status: "pending",
    })
    .select("id,created_at")
    .single();
  if (perr) {
    const message = typeof perr === "object" && perr && "message" in perr
      ? String((perr as { message: string }).message)
      : "Unknown error";
    return oops(message);
  }

  let instructions: Instructions;
  if (body.method === "bank_transfer") {
    const { data: banks } = await supa
      .from("bank_accounts")
      .select(
        "bank_name,account_name,account_number,currency,is_active",
      )
      .eq("is_active", true)
      .order("display_order");
    instructions = {
      type: "bank_transfer",
      banks: (banks as BankAccount[]) || [],
    };
  } else if (body.method === "crypto") {
    const cryptoAddress = await getCryptoDepositAddress();
    if (!cryptoAddress) {
      return oops("Crypto deposit address is not configured");
    }
    instructions = {
      type: "crypto",
      address: cryptoAddress,
      note:
        "Send USDT (TRC20) to the provided address. Upload your transaction receipt after payment.",
    };
  } else {
    return bad("Unsupported payment method");
  }

  return json(
    { ok: true, payment_id: pay!.id, instructions },
    200,
    corsHeaders,
  );
}

if (import.meta.main) serve(handler);

export default handler;
