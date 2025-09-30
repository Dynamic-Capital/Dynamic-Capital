import { createClient } from "../_shared/client.ts";
import { getEnv } from "../_shared/env.ts";
import {
  bad,
  corsHeaders,
  mna,
  nf,
  ok,
  oops,
  unauth,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const DEFAULT_FIAT_CURRENCY = "MVR";

type RequestBody = {
  order_id?: string;
  tx_hash?: string;
  amount_dct?: number;
  fee_dct?: number;
  network?: string;
  signer_public_key?: string;
  memo?: string;
  actor?: string;
};

export const handler = registerHandler(async (req) => {
  const headers = corsHeaders(req, "POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return mna();
  }

  const adminSecret = getEnv("ADMIN_API_SECRET");
  if (!adminSecret) {
    console.error("ADMIN_API_SECRET not configured");
    return oops("Admin secret not configured");
  }

  const headerSecret = req.headers.get("X-Admin-Secret") || "";
  if (headerSecret !== adminSecret) {
    return unauth("Invalid admin secret");
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON payload", undefined, req);
  }

  if (!body.order_id) return bad("order_id is required", undefined, req);
  if (!body.tx_hash) return bad("tx_hash is required", undefined, req);
  if (!body.amount_dct || Number(body.amount_dct) <= 0) {
    return bad("amount_dct must be positive", undefined, req);
  }
  if (!body.network) return bad("network is required", undefined, req);
  if (!body.signer_public_key) {
    return bad("signer_public_key is required", undefined, req);
  }

  const supa = createClient("service");

  const { data: order, error: orderError } = await supa
    .from("orders")
    .select("id,status,amount_fiat,reference_code")
    .eq("id", body.order_id)
    .maybeSingle();

  if (orderError) {
    console.error("settle-order order lookup error", orderError);
    return oops("Failed to load order", orderError, req);
  }

  if (!order?.id) {
    return nf("Order not found", req);
  }

  const { data: existingTransfer } = await supa
    .from("treasury_transfers")
    .select("id")
    .eq("tx_hash", body.tx_hash)
    .maybeSingle();

  if (existingTransfer?.id) {
    return ok(
      { duplicate: true, treasury_transfer_id: existingTransfer.id },
      req,
    );
  }

  const nowIso = new Date().toISOString();
  const amountDct = Number(body.amount_dct);
  const fiatAmount = Number(order.amount_fiat);
  if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) {
    return oops("Order amount is invalid", undefined, req);
  }
  const feeDctRaw = body.fee_dct !== undefined && body.fee_dct !== null
    ? Number(body.fee_dct)
    : 0;
  const feeDct = Number.isFinite(feeDctRaw) && feeDctRaw > 0 ? feeDctRaw : 0;

  const { data: transfer, error: transferError } = await supa
    .from("treasury_transfers")
    .insert({
      order_id: order.id,
      tx_hash: body.tx_hash,
      signer_public_key: body.signer_public_key,
      amount_dct: amountDct,
      fee_dct: feeDct || 0,
      network: body.network,
      settled_at: nowIso,
    })
    .select("id")
    .maybeSingle();

  if (transferError) {
    console.error("settle-order transfer insert error", transferError);
    return oops("Failed to record treasury transfer", transferError, req);
  }

  await supa
    .from("orders")
    .update({ status: "settled" })
    .eq("id", order.id);

  await supa
    .from("payment_references")
    .update({ status: "consumed", consumed_at: nowIso })
    .eq("order_id", order.id)
    .eq("status", "assigned")
    .catch((err) => {
      console.warn("payment reference update failed", err);
    });

  const ledgerEntries = [
    {
      entry_type: "fiat" as const,
      reference_id: order.id,
      reference_table: "orders",
      debit: 0,
      credit: fiatAmount,
      currency: DEFAULT_FIAT_CURRENCY,
      memo: body.memo ?? `Fiat settlement for ${order.reference_code}`,
      occurred_at: nowIso,
    },
    {
      entry_type: "token" as const,
      reference_id: order.id,
      reference_table: "orders",
      debit: amountDct,
      credit: 0,
      currency: "DCT",
      memo: `DCT transfer ${body.tx_hash}`,
      occurred_at: nowIso,
    },
  ];

  if (feeDct > 0) {
    ledgerEntries.push({
      entry_type: "fee" as const,
      reference_id: order.id,
      reference_table: "orders",
      debit: feeDct,
      credit: 0,
      currency: "DCT",
      memo: `Network fee for ${body.tx_hash}`,
      occurred_at: nowIso,
    });
  }

  const { error: ledgerError } = await supa
    .from("accounting_ledger")
    .insert(ledgerEntries);

  if (ledgerError) {
    console.error("settle-order ledger insert error", ledgerError);
  }

  await supa.from("verification_logs").insert({
    order_id: order.id,
    rule_name: "settlement_recorded",
    result: "pass",
    notes: `Treasury transfer ${body.tx_hash} recorded`,
  }).catch((err) => {
    console.warn("verification log settlement insert failed", err);
  });

  await supa.from("audit_events").insert({
    entity_type: "order",
    entity_id: order.id,
    action: "settled",
    actor: body.actor ?? "treasury_bot",
    payload: {
      tx_hash: body.tx_hash,
      amount_dct: amountDct,
      fee_dct: feeDct,
      network: body.network,
    },
  }).catch((err) => {
    console.warn("audit event settlement failed", err);
  });

  return ok({
    treasury_transfer_id: transfer?.id,
    order_id: order.id,
  }, req);
});

export default handler;
