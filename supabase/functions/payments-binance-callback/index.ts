import {
  buildCallbackAck,
  getBinancePayCredentials,
  readCallbackHeaders,
  verifyCallbackSignature,
} from "../../../apps/web/integrations/binance/client.ts";
import { bad, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
import {
  ensureFeatureRegistered,
  isFeatureEnabled,
} from "../_shared/features.ts";
import { registerPlugin } from "../_shared/plugins.ts";

const FEATURE_KEY = "payments.binance_callback";
const PLUGIN_KEY = "gateway:binance-pay";

function headersComplete(headers: Record<string, string | undefined>) {
  return (
    Boolean(headers["x-binancepay-timestamp"]) &&
    Boolean(headers["x-binancepay-nonce"]) &&
    Boolean(headers["x-binancepay-signature"])
  );
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
    "Enable Binance Pay callback ingestion",
    false,
    {
      gateway: "binance-pay",
    },
  );

  await registerPlugin({
    key: PLUGIN_KEY,
    type: "payment-gateway",
    version: "1.0.0",
    description: "Binance Pay webhook ingestion pipeline",
    enabled: true,
    metadata: { feature: FEATURE_KEY },
  });

  const bodyText = await req.text();
  if (!bodyText) {
    return bad("Empty webhook payload", undefined, req);
  }

  const headers = readCallbackHeaders(req);
  if (!headersComplete(headers)) {
    return jsonResponse(
      { ok: false, error: "Missing Binance Pay signature headers" },
      { status: 400 },
      req,
    );
  }

  const { secretKey } = getBinancePayCredentials();
  const signatureValid = await verifyCallbackSignature({
    body: bodyText,
    headers,
    secretKey,
  });

  if (!signatureValid) {
    console.warn("[binance] signature mismatch", { headers });
    return jsonResponse({ ok: false, error: "Signature verification failed" }, {
      status: 401,
    }, req);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch (error) {
    console.error("[binance] invalid JSON payload", error);
    return bad("Invalid JSON payload", undefined, req);
  }

  const supabase = createClient("service");

  const payloadRecord = (payload ?? {}) as Record<string, unknown>;
  const payloadData = (payloadRecord.data ?? {}) as Record<string, unknown>;
  const reference = [
    payloadRecord["merchantTradeNo"],
    payloadRecord["orderId"],
    payloadData["merchantTradeNo"],
    payloadData["orderId"],
    payloadData["prepayId"],
  ]
    .map((
      value,
    ) => (typeof value === "string" && value.trim().length ? value : null))
    .find((value): value is string => Boolean(value)) ?? null;

  const storedHeaders = {
    "x-binancepay-timestamp": headers["x-binancepay-timestamp"],
    "x-binancepay-nonce": headers["x-binancepay-nonce"],
    "x-binancepay-signature": headers["x-binancepay-signature"],
    ...(headers["x-binancepay-serial"]
      ? { "x-binancepay-serial": headers["x-binancepay-serial"] }
      : {}),
  };

  const eventRecord = {
    gateway: "binance_pay",
    reference,
    payload,
    headers: storedHeaders,
    signature: headers["x-binancepay-signature"],
  };

  const featureEnabled = await isFeatureEnabled(FEATURE_KEY, false);

  const { error } = await supabase.from("payment_gateway_events").upsert(
    {
      gateway: eventRecord.gateway,
      reference: eventRecord.reference,
      payload: eventRecord.payload,
      headers: eventRecord.headers,
      signature: eventRecord.signature,
      status: featureEnabled ? "received" : "ignored",
    },
    { onConflict: "gateway,reference" },
  );

  if (error) {
    console.error("[binance] failed to persist gateway event", error);
  }

  if (!featureEnabled) {
    console.warn("[binance] feature disabled, skipping downstream processing");
    return jsonResponse(buildCallbackAck("disabled"), { status: 202 }, req);
  }

  // Downstream processing is delegated to existing receipt automation via scheduled workers.

  return jsonResponse(buildCallbackAck(), { status: 200 }, req);
});

export default handler;
