import { registerHandler } from "../_shared/serve.ts";
import { bad, corsHeaders, mna, ok, oops } from "../_shared/http.ts";
import { optionalEnv } from "../_shared/env.ts";
import { createClient } from "../_shared/client.ts";
import { fetchTonUsdRate } from "../_shared/pricing.ts";
import {
  buildExecutionPlan,
  serialiseExecutionPlan,
} from "../_shared/ton-execution-engine.ts";
import type { ExecutionPlanPayload } from "../_shared/ton-execution-engine.ts";

function parsePayload(raw: unknown, label: string): ExecutionPlanPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${label} must be a JSON object`);
  }
  const mapping = raw as Record<string, unknown>;
  if (!Array.isArray(mapping.liquidity)) {
    throw new Error(`${label}.liquidity must be an array`);
  }
  if (!mapping.telemetry || typeof mapping.telemetry !== "object") {
    throw new Error(`${label}.telemetry must be an object`);
  }
  if (!mapping.treasury || typeof mapping.treasury !== "object") {
    throw new Error(`${label}.treasury must be an object`);
  }
  return mapping as ExecutionPlanPayload;
}

async function resolvePayload(body: unknown): Promise<ExecutionPlanPayload> {
  if (body) {
    return parsePayload(body, "payload");
  }
  const defaultsEnv = optionalEnv("TON_EXECUTION_DEFAULTS");
  if (!defaultsEnv) {
    throw new Error(
      "Request body missing and TON_EXECUTION_DEFAULTS not configured",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(defaultsEnv);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `TON_EXECUTION_DEFAULTS invalid JSON: ${error.message}`
        : "TON_EXECUTION_DEFAULTS invalid JSON",
    );
  }
  return parsePayload(parsed, "TON_EXECUTION_DEFAULTS");
}

function ensureTelemetryPrice(
  payload: ExecutionPlanPayload,
  tonPrice: number | null,
) {
  if (!payload.telemetry || typeof payload.telemetry !== "object") return;
  const telemetry = payload.telemetry as Record<string, unknown>;
  const current = Number(telemetry.tonPriceUsd ?? telemetry.ton_price_usd ?? 0);
  if (!Number.isFinite(current) || current <= 0) {
    if (tonPrice && tonPrice > 0) {
      telemetry.tonPriceUsd = tonPrice;
    }
  }
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return mna();

  let body: unknown = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await req.json();
    } catch (error) {
      return bad(
        error instanceof Error ? error.message : "Invalid JSON",
        undefined,
        req,
      );
    }
  }

  let payload: ExecutionPlanPayload;
  try {
    payload = await resolvePayload(body);
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Invalid payload",
      undefined,
      req,
    );
  }

  const tonRate = await fetchTonUsdRate();
  ensureTelemetryPrice(payload, tonRate.rate ?? null);

  let plan;
  try {
    plan = buildExecutionPlan(payload);
  } catch (error) {
    return bad(
      error instanceof Error ? error.message : "Failed to build plan",
      undefined,
      req,
    );
  }
  const serialised = serialiseExecutionPlan(plan);

  const supabase = createClient("service");
  const generatedAt = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("ton_execution_plans")
    .insert({
      generated_at: generatedAt,
      payload,
      plan: serialised,
      ton_price_source: tonRate.source,
      ton_price_usd: tonRate.rate,
      has_high_priority_actions: plan.hasHighPriorityActions,
    });

  if (insertError) {
    console.error("ton-execution-plan insert error", insertError);
    return oops("Failed to persist execution plan", insertError.message, req);
  }

  return ok({
    ok: true,
    generatedAt,
    plan: serialised,
    tonPriceUsd: tonRate.rate,
    tonPriceSource: tonRate.source,
  }, req);
});

export default handler;
