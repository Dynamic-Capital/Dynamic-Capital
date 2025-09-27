import { bad, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { loadJsonModel } from "../_shared/ai_models.ts";

const MODEL_KEY = "fusion/latest.json";
const ACTION_THRESHOLD = 0.2;

interface FusionModelConfig {
  model: string;
  version: string;
  weights: Record<string, number>;
  regimes?: string[];
}

interface LobeInput {
  lobe: string;
  score: number;
  confidence?: number;
  rationale?: string;
}

interface FusionRequestBody {
  regime?: string;
  lobes: LobeInput[];
  metadata?: Record<string, unknown>;
}

function scoreToAction(score: number) {
  if (score > ACTION_THRESHOLD) return "BUY" as const;
  if (score < -ACTION_THRESHOLD) return "SELL" as const;
  return "HOLD" as const;
}

function combineSignals(payload: FusionRequestBody, model: FusionModelConfig) {
  const weights = model.weights ?? {};
  let scoreTotal = 0;
  let weightTotal = 0;
  let confidenceTotal = 0;

  const weightedLobes = payload.lobes.map((lobe) => {
    const weight = weights[lobe.lobe] ?? 0.1;
    const boundedScore = Math.max(-1, Math.min(1, Number(lobe.score)));
    const boundedConfidence = Math.max(
      0,
      Math.min(1, Number(lobe.confidence ?? Math.abs(boundedScore))),
    );

    scoreTotal += boundedScore * weight;
    weightTotal += weight;
    confidenceTotal += boundedConfidence * weight;

    return {
      ...lobe,
      weight: Number(weight.toFixed(4)),
      boundedScore: Number(boundedScore.toFixed(4)),
      boundedConfidence: Number(boundedConfidence.toFixed(4)),
    };
  });

  const normalisedScore = weightTotal === 0 ? 0 : scoreTotal / weightTotal;
  const normalisedConfidence = weightTotal === 0
    ? 0
    : confidenceTotal / weightTotal;
  const action = scoreToAction(normalisedScore);

  return {
    action,
    score: Number(normalisedScore.toFixed(4)),
    confidence: Number(
      Math.max(Math.abs(normalisedScore), normalisedConfidence).toFixed(4),
    ),
    lobes: weightedLobes,
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
    | FusionRequestBody
    | null;
  if (!payload || !Array.isArray(payload.lobes) || payload.lobes.length === 0) {
    return bad("Invalid payload: lobes array required", undefined, req);
  }

  const model = await loadJsonModel<FusionModelConfig>(MODEL_KEY);
  if (!model) {
    return jsonResponse({ ok: false, error: "Fusion model not available" }, {
      status: 503,
    }, req);
  }

  const fusion = combineSignals(payload, model);

  return jsonResponse(
    {
      ok: true,
      model: {
        name: model.model,
        version: model.version,
      },
      fusion,
      metadata: payload.metadata ?? {},
    },
    { status: 200 },
    req,
  );
});

export default handler;
