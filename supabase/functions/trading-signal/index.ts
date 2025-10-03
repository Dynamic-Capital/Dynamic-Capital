import {
  normalizeTradingViewAlert,
  type TradingViewAlertPayload,
} from "../../../apps/web/integrations/tradingview/alert.ts";
import { bad, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
import {
  ensureFeatureRegistered,
  isFeatureEnabled,
} from "../_shared/features.ts";
import { registerPlugin } from "../_shared/plugins.ts";
import { need } from "../_shared/env.ts";

const FEATURE_KEY = "trading.signals_ingest";
const PLUGIN_KEY = "tradingview:webhook";
const SECRET_HEADER = "x-tradingview-secret";

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST,OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  await ensureFeatureRegistered(
    FEATURE_KEY,
    "Allow TradingView alerts to create MT5 signals",
    true,
    { source: "tradingview" },
  );

  await registerPlugin({
    key: PLUGIN_KEY,
    type: "trading-signal",
    version: "1.0.0",
    description: "TradingView → Supabase signal ingestion",
    enabled: true,
    metadata: { feature: FEATURE_KEY },
  });

  const secret = need("TRADING_SIGNALS_WEBHOOK_SECRET");
  const provided = req.headers.get(SECRET_HEADER) ?? "";
  if (!provided || !timingSafeEqual(provided, secret)) {
    console.warn("[tradingview] rejected webhook due to secret mismatch");
    return jsonResponse(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
      req,
    );
  }

  let payload: TradingViewAlertPayload;
  try {
    payload = await req.json() as TradingViewAlertPayload;
  } catch (error) {
    console.error("[tradingview] invalid JSON payload", error);
    return bad("Invalid JSON payload", undefined, req);
  }

  let normalized;
  try {
    normalized = normalizeTradingViewAlert(payload);
  } catch (error) {
    console.error("[tradingview] normalization failed", error);
    return jsonResponse(
      {
        ok: false,
        error: (error instanceof Error ? error.message : "Invalid payload"),
      },
      { status: 400 },
      req,
    );
  }

  const supabase = createClient("service");
  const featureEnabled = await isFeatureEnabled(FEATURE_KEY, false);

  const insertPayload = {
    alert_id: normalized.alertId,
    source: "tradingview",
    symbol: normalized.symbol,
    timeframe: normalized.timeframe,
    direction: normalized.direction,
    order_type: normalized.orderType,
    priority: normalized.priority,
    payload: normalized.raw,
    status: featureEnabled ? "pending" : "cancelled",
  };

  const { error } = await supabase
    .from("signals")
    .upsert(insertPayload, { onConflict: "alert_id" })
    .select("id")
    .single();

  if (error) {
    console.error("[tradingview] failed to persist signal", error);
    return jsonResponse({ ok: false, error: "Failed to persist signal" }, {
      status: 500,
    }, req);
  }

  if (!featureEnabled) {
    console.warn(
      "[tradingview] feature disabled, skipping downstream dispatch",
    );
    return jsonResponse(
      { status: "queued", alertId: normalized.alertId, enabled: false },
      { status: 202 },
      req,
    );
  }

  return jsonResponse({ status: "ok", alertId: normalized.alertId }, {
    status: 200,
  }, req);
});

export default handler;
