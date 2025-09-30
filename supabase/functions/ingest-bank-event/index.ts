import { createClient } from "../_shared/client.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeHash(payload: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return toHex(digest);
}

async function verifySignature(
  secret: string,
  payload: string,
  signature: string,
) {
  const normalized = signature.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!normalized) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = toHex(signed).toLowerCase();
  return computed === normalized;
}

type NormalizedEvent = {
  reference_code?: string;
  sender_account?: string | null;
  sender_name?: string | null;
  amount_fiat?: number;
  currency?: string;
  transaction_date?: string;
  status?: string;
};

const AMOUNT_TOLERANCE = 1;

export const handler = registerHandler(async (req) => {
  const headers = corsHeaders(req, "POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return mna();
  }

  const secret = Deno.env.get("BANK_WEBHOOK_SECRET");
  if (!secret) {
    console.error("BANK_WEBHOOK_SECRET is not configured");
    return oops("bank webhook secret missing");
  }

  const signatureHeader = req.headers.get("x-bank-signature") ||
    req.headers.get("x-signature") || "";
  if (!signatureHeader) {
    return unauth("Missing signature header");
  }

  const rawBody = await req.text();
  if (!rawBody) {
    return bad("Empty payload");
  }

  const isValid = await verifySignature(secret, rawBody, signatureHeader);
  if (!isValid) {
    return unauth("Invalid signature");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody);
  } catch (err) {
    console.error("ingest-bank-event JSON parse error", err);
    return bad("Invalid JSON payload");
  }

  const provider = typeof parsed.provider === "string" && parsed.provider
    ? parsed.provider
    : "bank_webhook";

  const normalized: NormalizedEvent = {
    reference_code: typeof parsed.reference_code === "string"
      ? parsed.reference_code
      : undefined,
    sender_account: typeof parsed.sender_account === "string"
      ? parsed.sender_account
      : null,
    sender_name: typeof parsed.sender_name === "string"
      ? parsed.sender_name
      : null,
    amount_fiat: Number(parsed.amount_fiat),
    currency: typeof parsed.currency === "string" ? parsed.currency : undefined,
    transaction_date: typeof parsed.transaction_date === "string"
      ? new Date(parsed.transaction_date).toISOString()
      : undefined,
    status: typeof parsed.status === "string" ? parsed.status : undefined,
  };

  if (
    normalized.amount_fiat !== undefined &&
    !Number.isFinite(normalized.amount_fiat)
  ) {
    normalized.amount_fiat = undefined;
  }

  const supa = createClient("service");

  const hash = await computeHash(rawBody);

  let rawEventId: number | null = null;
  let duplicate = false;

  const { data: inserted, error: insertError } = await supa
    .from("bank_events_raw")
    .insert({
      provider,
      payload: parsed,
      signature: signatureHeader,
      hash_sha256: hash,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      duplicate = true;
      const { data: existing } = await supa
        .from("bank_events_raw")
        .select("id")
        .eq("hash_sha256", hash)
        .maybeSingle();
      rawEventId = existing?.id ?? null;
    } else {
      console.error("ingest-bank-event insert error", insertError);
      return oops("Failed to persist bank event", insertError);
    }
  } else {
    rawEventId = inserted?.id ?? null;
  }

  if (
    rawEventId && normalized.reference_code &&
    normalized.amount_fiat !== undefined && normalized.currency &&
    normalized.transaction_date
  ) {
    const normalizedPayload = {
      raw_event_id: rawEventId,
      reference_code: normalized.reference_code,
      sender_account: normalized.sender_account,
      sender_name: normalized.sender_name,
      amount_fiat: normalized.amount_fiat,
      currency: normalized.currency,
      transaction_date: normalized.transaction_date,
      status: normalized.status ?? "received",
    };

    const { error: normError } = await supa
      .from("bank_events_normalized")
      .upsert(normalizedPayload, {
        onConflict: "reference_code,sender_account,transaction_date",
      });

    if (normError) {
      console.error("ingest-bank-event normalized upsert error", normError);
    }
  }

  let matchedOrderId: string | null = null;
  let matchStatus: "matched" | "mismatch" | "not_found" = "not_found";

  if (normalized.reference_code) {
    const { data: order } = await supa
      .from("orders")
      .select("id,amount_fiat,status")
      .eq("reference_code", normalized.reference_code)
      .maybeSingle();

    if (order?.id) {
      matchedOrderId = order.id as string;
      const expectedAmount = Number(order.amount_fiat);
      const receivedAmount = normalized.amount_fiat ?? NaN;
      const amountMatches = Number.isFinite(expectedAmount) &&
        Number.isFinite(receivedAmount) &&
        Math.abs(expectedAmount - receivedAmount) <= AMOUNT_TOLERANCE;

      if (amountMatches) {
        matchStatus = "matched";
        await supa
          .from("orders")
          .update({ status: "verifying" })
          .eq("id", order.id)
          .in("status", ["awaiting_payment", "pending"]);

        await supa.from("verification_logs").insert({
          order_id: order.id,
          rule_name: "bank_amount_match",
          result: "pass",
          notes: `Bank event ${hash} matched amount ${receivedAmount}`,
        }).catch((err) => {
          console.warn("verification log insert failed", err);
        });
      } else {
        matchStatus = "mismatch";
        await supa.from("verification_logs").insert({
          order_id: order.id,
          rule_name: "bank_amount_match",
          result: "fail",
          notes:
            `Expected ${expectedAmount}, received ${normalized.amount_fiat}`,
        }).catch((err) => {
          console.warn("verification log insert failed", err);
        });
      }
    }
  }

  await supa.from("audit_events").insert({
    entity_type: "bank_event",
    entity_id: rawEventId ? String(rawEventId) : hash,
    action: duplicate ? "duplicate" : "ingested",
    actor: "bank_webhook",
    payload: {
      reference_code: normalized.reference_code ?? null,
      matched_order_id: matchedOrderId,
      match_status: matchStatus,
      provider,
    },
  }).catch((err) => {
    console.warn("audit event insert failed", err);
  });

  return ok({
    raw_event_id: rawEventId,
    duplicate,
    match_status: matchStatus,
    matched_order_id: matchedOrderId,
  }, req);
});

export default handler;
