import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { getEnv } from "../_shared/env.ts";
import { corsHeaders, json, oops } from "../_shared/http.ts";
import { version } from "../_shared/version.ts";

interface PaymentEvent {
  id?: string;
  type?: string;
  created_at?: string;
  data?: {
    payment_id?: string;
    external_id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    plan_id?: string;
    metadata?: Record<string, unknown> | null;
  };
}

const SIGNATURE_HEADER = "x-payment-signature";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

async function verifySignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const digest = hex(sig);
  return timingSafeEqual(digest, signature.toLowerCase());
}

function normalizeStatus(
  type?: string,
  explicit?: string | null,
): string | null {
  const normalized = explicit?.toLowerCase();
  if (
    normalized &&
    ["pending", "completed", "failed", "cancelled", "processing"].includes(
      normalized,
    )
  ) {
    return normalized;
  }
  const fallback = type?.toLowerCase();
  if (!fallback) return null;
  if (fallback.includes("completed")) return "completed";
  if (fallback.includes("failed") || fallback.includes("declined")) {
    return "failed";
  }
  if (fallback.includes("cancel")) return "cancelled";
  if (fallback.includes("pending") || fallback.includes("created")) {
    return "pending";
  }
  return null;
}

export async function handler(req: Request): Promise<Response> {
  const headers = corsHeaders(req, "POST,OPTIONS");
  const ver = version(req, "payment-webhook");
  if (ver) return ver;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405, {}, req);
  }

  const secret = getEnv("PAYMENT_WEBHOOK_SECRET");
  const signature = (req.headers.get(SIGNATURE_HEADER) || "").trim()
    .toLowerCase();
  const rawBody = await req.text();

  if (!signature || !(await verifySignature(rawBody, signature, secret))) {
    return json({ ok: false, error: "invalid_signature" }, 401, {}, req);
  }

  let event: PaymentEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, {}, req);
  }

  const data = event.data ?? {};
  const resolvedStatus = normalizeStatus(event.type, data.status ?? null);

  const supa = createClient("service");

  let paymentId = data.payment_id ? String(data.payment_id) : null;
  let paymentProviderId = data.external_id ? String(data.external_id) : null;

  let paymentRow: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    webhook_data: Record<string, unknown> | null;
  } | null = null;

  try {
    if (paymentId) {
      const { data: found, error } = await supa
        .from("payments")
        .select("id,status,amount,currency,webhook_data")
        .eq("id", paymentId)
        .maybeSingle();
      if (error) throw error;
      paymentRow = (found as typeof paymentRow) ?? null;
    } else if (paymentProviderId) {
      const { data: found, error } = await supa
        .from("payments")
        .select("id,status,amount,currency,webhook_data")
        .eq("payment_provider_id", paymentProviderId)
        .maybeSingle();
      if (error) throw error;
      paymentRow = (found as typeof paymentRow) ?? null;
      if (paymentRow) {
        paymentId = paymentRow.id;
      }
    }
  } catch (error) {
    console.error("[payment-webhook] lookup error", error);
    return oops(
      "payment_lookup_failed",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }

  if (!paymentRow) {
    console.warn("[payment-webhook] payment not found", {
      payment_id: paymentId,
      external_id: paymentProviderId,
    });
    return json(
      { ok: true, skipped: true, reason: "payment_not_found" },
      202,
      {},
      req,
    );
  }

  const existingData =
    (paymentRow.webhook_data && typeof paymentRow.webhook_data === "object")
      ? { ...paymentRow.webhook_data }
      : {};

  const history = Array.isArray(existingData.history)
    ? [...existingData.history]
    : [];

  history.push({
    id: event.id ?? null,
    type: event.type ?? "unknown",
    received_at: new Date().toISOString(),
    payload: event,
  });

  const webhookData = {
    ...existingData,
    last_event: event.type ?? "unknown",
    last_event_at: event.created_at ?? new Date().toISOString(),
    payment_provider_id: paymentProviderId,
    history,
  };

  const updates: Record<string, unknown> = {
    webhook_data: webhookData,
  };

  if (resolvedStatus && resolvedStatus !== paymentRow.status) {
    updates.status = resolvedStatus;
  }

  const normalizedAmount = coerceNumber(data.amount);
  if (normalizedAmount !== null) {
    updates.amount = Number(normalizedAmount.toFixed(2));
  }

  if (typeof data.currency === "string" && data.currency.trim()) {
    updates.currency = data.currency.trim().toUpperCase();
  }

  if (paymentProviderId) {
    updates.payment_provider_id = paymentProviderId;
  }

  try {
    const { error } = await supa
      .from("payments")
      .update(updates)
      .eq("id", paymentRow.id);
    if (error) throw error;
  } catch (error) {
    console.error("[payment-webhook] update failed", error);
    return oops(
      "payment_update_failed",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }

  return json(
    {
      ok: true,
      payment_id: paymentRow.id,
      status: updates.status ?? paymentRow.status,
    },
    200,
    {},
    req,
  );
}

if (import.meta.main) {
  serve(handler);
}

export default handler;
