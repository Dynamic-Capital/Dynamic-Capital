import { registerHandler } from "../_shared/serve.ts";
import { createClient, createSupabaseClient } from "../_shared/client.ts";
import { getEnv } from "../_shared/env.ts";
import { bad, json, mna, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  payment_id: string;
  telegram_id?: string;
  filename?: string;
  content_type?: string;
  initData?: string;
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const v = version(req, "receipt-upload-url");
  if (v) return v;
  if (req.method !== "POST") return mna();

  // Check for web auth first
  const authHeader = req.headers.get("Authorization");
  let telegramId: string | null = null;

  if (authHeader) {
    // Web user authentication
    const supaAuth = createSupabaseClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY"),
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      },
    );

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

  // Use telegram_id from auth, initData, or body (for bot usage)
  const finalTelegramId = telegramId || body.telegram_id;
  if (!finalTelegramId) {
    return json({ error: "unauthorized" }, 401, corsHeaders);
  }

  const supa = createClient("service");

  // Generate unique file path
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().split("-")[0];
  const fileName = body.filename ||
    `receipt_${body.payment_id}_${timestamp}_${randomId}`;
  const key = `receipts/${finalTelegramId}/${crypto.randomUUID()}-${fileName}`;

  const { data: signed, error } = await supa.storage
    .from("payment-receipts")
    .createSignedUploadUrl(key);
  if (error) {
    return oops(error.message);
  }

  return json(
    {
      ok: true,
      bucket: "payment-receipts",
      file_path: key,
      upload_url: signed.signedUrl,
    },
    200,
    corsHeaders,
  );
}

registerHandler(handler);

export default handler;
