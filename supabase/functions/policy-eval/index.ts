import { bad, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { loadJsonModel } from "../_shared/ai_models.ts";

const MODEL_KEY = "policy/latest.json";

interface PolicyModelConfig {
  model: string;
  version: string;
  limits: {
    max_var: number;
    max_drawdown: number;
    max_gross_exposure: number;
    min_treasury_ratio: number;
  };
}

interface PolicyRequest {
  treasury: {
    balance: number;
    liabilities: number;
    var?: number;
    drawdown?: number;
  };
  exposure: {
    gross: number;
    net: number;
  };
  signals?: {
    action: string;
    confidence: number;
  };
  metadata?: Record<string, unknown>;
}

const FALLBACK_CONFIG: PolicyModelConfig = {
  model: "policy-guardrails",
  version: "v0",
  limits: {
    max_var: 0.08,
    max_drawdown: 0.15,
    max_gross_exposure: 3,
    min_treasury_ratio: 1.2,
  },
};

function evaluatePolicy(payload: PolicyRequest, model: PolicyModelConfig) {
  const { limits } = model;
  const treasuryRatio = payload.treasury.balance /
    Math.max(payload.treasury.liabilities, 1e-6);
  const varBreach = (payload.treasury.var ?? 0) > limits.max_var;
  const drawdownBreach = (payload.treasury.drawdown ?? 0) > limits.max_drawdown;
  const exposureBreach = payload.exposure.gross > limits.max_gross_exposure;
  const treasuryBreach = treasuryRatio < limits.min_treasury_ratio;

  const breaches = {
    valueAtRisk: varBreach,
    drawdown: drawdownBreach,
    grossExposure: exposureBreach,
    treasury: treasuryBreach,
  };

  const breachCount = Object.values(breaches).filter(Boolean).length;
  let action: "MAINTAIN" | "DELEVER" | "HALT" = "MAINTAIN";

  if (
    breachCount === 0 && payload.signals?.action === "BUY" &&
    payload.signals.confidence > 0.6
  ) {
    action = "MAINTAIN";
  } else if (breachCount === 1) {
    action = "DELEVER";
  } else if (breachCount > 1) {
    action = "HALT";
  }

  const confidence = Math.min(1, 0.5 + 0.1 * breachCount);

  return {
    action,
    confidence: Number(confidence.toFixed(4)),
    breaches,
    treasuryRatio: Number(treasuryRatio.toFixed(4)),
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

  const payload = await req.json().catch(() => null) as PolicyRequest | null;
  if (!payload || !payload.treasury || !payload.exposure) {
    return bad(
      "Invalid payload: treasury and exposure are required",
      undefined,
      req,
    );
  }

  const model = await loadJsonModel<PolicyModelConfig>(MODEL_KEY) ??
    FALLBACK_CONFIG;
  const evaluation = evaluatePolicy(payload, model);

  return jsonResponse(
    {
      ok: true,
      model: {
        name: model.model,
        version: model.version,
        limits: model.limits,
      },
      evaluation,
      metadata: payload.metadata ?? {},
    },
    { status: 200 },
    req,
  );
});

export default handler;
