import { createClient } from "../_shared/client.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { ensureUserId, resolveTelegramId } from "../_shared/order-users.ts";

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateReference(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let ref = "DC";
  for (const b of bytes) {
    ref += REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length];
  }
  return ref;
}

type RequestBody = {
  amount_fiat?: number;
  target_dct?: number;
  quote_hash?: string;
  pricing_locked_at?: string;
  expires_at?: string;
  initData?: string;
  telegram_id?: string | number;
};

export const handler = registerHandler(async (req) => {
  const headers = corsHeaders(req, "POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return mna();
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON payload", undefined, req);
  }

  const telegramId = await resolveTelegramId(
    req,
    body.initData,
    body.telegram_id,
  );
  if (!telegramId) {
    return unauth("Unable to resolve user", req);
  }

  const amount = Number(body.amount_fiat);
  const target = Number(body.target_dct);
  const quoteHash = String(body.quote_hash || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return bad("amount_fiat must be a positive number", undefined, req);
  }

  if (!Number.isFinite(target) || target <= 0) {
    return bad("target_dct must be a positive number", undefined, req);
  }

  if (!quoteHash) {
    return bad("quote_hash is required", undefined, req);
  }

  const nowIso = new Date().toISOString();
  let pricingLockedAt: string;
  if (body.pricing_locked_at) {
    const dt = new Date(body.pricing_locked_at);
    if (Number.isNaN(dt.getTime())) {
      return bad("Invalid pricing_locked_at", undefined, req);
    }
    pricingLockedAt = dt.toISOString();
  } else {
    pricingLockedAt = nowIso;
  }

  let expiresAt: string;
  if (body.expires_at) {
    const dt = new Date(body.expires_at);
    if (Number.isNaN(dt.getTime())) {
      return bad("Invalid expires_at", undefined, req);
    }
    expiresAt = dt.toISOString();
  } else {
    const expiry = new Date(pricingLockedAt);
    expiry.setMinutes(expiry.getMinutes() + 45);
    expiresAt = expiry.toISOString();
  }

  const supa = createClient("service");

  let userId: string;
  try {
    userId = await ensureUserId(supa, telegramId);
  } catch (err) {
    console.error("bank-order-init ensureUserId failed", err);
    return oops(
      "Unable to resolve user profile",
      err instanceof Error ? err.message : err,
      req,
    );
  }

  let referenceCode = "";
  let orderId: string | null = null;
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts && !orderId; attempt++) {
    referenceCode = generateReference();
    const { data, error } = await supa
      .from("orders")
      .insert({
        user_id: userId,
        amount_fiat: amount,
        target_dct: target,
        status: "awaiting_payment",
        reference_code: referenceCode,
        quote_hash: quoteHash,
        expires_at: expiresAt,
        pricing_locked_at: pricingLockedAt,
      })
      .select("id,reference_code,expires_at,created_at")
      .maybeSingle();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        continue;
      }
      console.error("bank-order-init insert error", error);
      return oops("Failed to create order", error, req);
    }

    if (data?.id) {
      orderId = data.id as string;
    }
  }

  if (!orderId) {
    return oops("Unable to allocate unique reference", undefined, req);
  }

  const reserveStatus = {
    reference_code: referenceCode,
    order_id: orderId,
    status: "assigned" as const,
    reserved_at: new Date().toISOString(),
  };

  const { error: refError } = await supa
    .from("payment_references")
    .insert(reserveStatus)
    .onConflict("reference_code")
    .ignore();

  if (refError) {
    console.error("bank-order-init payment_references error", refError);
  }

  await supa.from("audit_events").insert({
    entity_type: "order",
    entity_id: orderId,
    action: "created",
    actor: `telegram:${telegramId}`,
    payload: {
      amount_fiat: amount,
      target_dct: target,
      reference_code: referenceCode,
      quote_hash: quoteHash,
    },
  }).catch((err) => {
    console.warn("bank-order-init audit event failed", err);
  });

  return ok({
    order_id: orderId,
    reference_code: referenceCode,
    expires_at: expiresAt,
    pricing_locked_at: pricingLockedAt,
    amount_fiat: amount,
    target_dct: target,
  }, req);
});

export default handler;
