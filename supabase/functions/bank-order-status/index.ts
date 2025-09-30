import { createClient } from "../_shared/client.ts";
import { ensureUserId, resolveTelegramId } from "../_shared/order-users.ts";
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

type RequestBody = {
  order_id?: string;
  reference_code?: string;
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

  if (!body.order_id && !body.reference_code) {
    return bad("order_id or reference_code is required", undefined, req);
  }

  const telegramId = await resolveTelegramId(
    req,
    body.initData,
    body.telegram_id,
  );
  if (!telegramId) {
    return unauth("Unable to resolve user", req);
  }

  const supa = createClient("service");

  let userId: string;
  try {
    userId = await ensureUserId(supa, telegramId);
  } catch (err) {
    console.error("bank-order-status ensureUserId failed", err);
    return oops(
      "Unable to resolve user",
      err instanceof Error ? err.message : err,
      req,
    );
  }

  const query = supa
    .from("orders")
    .select(
      "id,user_id,amount_fiat,target_dct,status,reference_code,quote_hash,expires_at,pricing_locked_at,created_at,updated_at",
    )
    .limit(1);

  if (body.order_id) {
    query.eq("id", body.order_id);
  } else if (body.reference_code) {
    query.eq("reference_code", body.reference_code);
  }

  const { data: order, error: orderError } = await query.maybeSingle();
  if (orderError) {
    console.error("bank-order-status order lookup error", orderError);
    return oops("Failed to load order", orderError, req);
  }

  if (!order) {
    return nf("Order not found", req);
  }

  if (order.user_id !== userId) {
    return unauth("Order does not belong to user", req);
  }

  const orderId = order.id as string;

  const [receiptsRes, verificationsRes, transfersRes, bankEventsRes] =
    await Promise.all([
      supa
        .from("receipt_uploads")
        .select("id,storage_path,checksum_sha256,file_bytes,uploaded_at")
        .eq("order_id", orderId)
        .order("uploaded_at", { ascending: false }),
      supa
        .from("verification_logs")
        .select("rule_name,result,notes,created_at,reviewer_id")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      supa
        .from("treasury_transfers")
        .select("tx_hash,amount_dct,fee_dct,network,settled_at")
        .eq("order_id", orderId)
        .order("settled_at", { ascending: false }),
      supa
        .from("bank_events_normalized")
        .select(
          "amount_fiat,currency,status,transaction_date,sender_name,sender_account",
        )
        .eq("reference_code", order.reference_code)
        .order("transaction_date", { ascending: false })
        .limit(5),
    ]);

  const response = {
    order: {
      id: order.id,
      status: order.status,
      amount_fiat: order.amount_fiat,
      target_dct: order.target_dct,
      reference_code: order.reference_code,
      quote_hash: order.quote_hash,
      pricing_locked_at: order.pricing_locked_at,
      expires_at: order.expires_at,
      created_at: order.created_at,
      updated_at: order.updated_at,
    },
    receipts: receiptsRes.data ?? [],
    verification_logs: verificationsRes.data ?? [],
    treasury_transfers: transfersRes.data ?? [],
    bank_events: bankEventsRes.data ?? [],
  };

  return ok(response, req);
});

export default handler;
