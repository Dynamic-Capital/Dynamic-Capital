import { bad, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { loadJsonModel } from "../_shared/ai_models.ts";

const MODEL_KEY = "lorentzian/latest.json";

interface LorentzianModelConfig {
  model: string;
  version: string;
  sensitivity: number;
  action_threshold: number;
  dispersion_floor?: number;
}

interface LorentzianRequest {
  price: number;
  reference_price?: number;
  dispersion?: number;
  metadata?: Record<string, unknown>;
}

function computeLorentzianDistance(
  payload: LorentzianRequest,
  model: LorentzianModelConfig,
) {
  const price = Number(payload.price);
  const reference = Number(payload.reference_price ?? price);
  const dispersion = Math.max(
    Number(payload.dispersion ?? model.dispersion_floor ?? 0.1),
    1e-6,
  );

  const diff = price - reference;
  const distance = Math.log1p((diff ** 2) / (1 + dispersion));
  const normalised = 1 - distance / Math.max(model.sensitivity, 1e-6);
  const clamped = Math.max(-1, Math.min(1, normalised));

  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  if (clamped > model.action_threshold) {
    action = "BUY";
  } else if (clamped < -model.action_threshold) {
    action = "SELL";
  }

  const confidence = Math.max(
    0.1,
    Math.min(1, Math.abs(clamped) / Math.max(model.action_threshold, 1e-6)),
  );

  return {
    action,
    score: Number(clamped.toFixed(4)),
    confidence: Number(confidence.toFixed(4)),
    distance: Number(distance.toFixed(4)),
    reference,
    diff: Number(diff.toFixed(4)),
  };
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

  const payload = await req.json().catch(() => null) as
    | LorentzianRequest
    | null;
  if (!payload || typeof payload.price !== "number") {
    return bad("Invalid payload: expected price field", undefined, req);
  }

  const model = await loadJsonModel<LorentzianModelConfig>(MODEL_KEY);
  if (!model) {
    return jsonResponse({ ok: false, error: "Model not available" }, {
      status: 503,
    }, req);
  }

  const evaluation = computeLorentzianDistance(payload, model);

  return jsonResponse(
    {
      ok: true,
      model: {
        name: model.model,
        version: model.version,
      },
      evaluation,
      metadata: payload.metadata ?? {},
    },
    { status: 200 },
    req,
  );
});

export default handler;
