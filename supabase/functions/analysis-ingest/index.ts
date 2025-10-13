import { getServiceClient } from "../_shared/client.ts";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "analysis-ingest";
const BIASES = ["BUY", "SELL", "NEUTRAL"] as const;
type Bias = (typeof BIASES)[number];
const ALLOWED_BIASES = new Set<Bias>(BIASES);
const DEFAULT_AUTHOR = "DynamicCapital-FX";

interface InsightPayload {
  symbol: string;
  bias?: string;
  content: string;
  chart_url?: string | null;
  chartUrl?: string | null;
  author?: string;
}

function coerceString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normaliseBias(rawBias: unknown): Bias {
  const value = coerceString(rawBias)?.toUpperCase();
  if (!value) return "NEUTRAL";
  if (ALLOWED_BIASES.has(value as Bias)) {
    return value as Bias;
  }
  throw new Error(`unsupported_bias:${value}`);
}

function normaliseChartUrl(raw: unknown): string | null {
  const value = coerceString(raw);
  if (!value) return null;

  const candidate = value.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    throw new Error("invalid_chart_url");
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("invalid_chart_url");
    }
    return url.toString();
  } catch {
    throw new Error("invalid_chart_url");
  }
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(req, "POST,OPTIONS") },
    });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  const logger = createLogger({
    function: FUNCTION_NAME,
    requestId: req.headers.get("sb-request-id") ||
      req.headers.get("x-request-id") ||
      crypto.randomUUID(),
  });

  let payload: InsightPayload;
  try {
    payload = await req.json() as InsightPayload;
  } catch (error) {
    logger.warn("Failed to parse JSON payload", error);
    return bad("invalid_json", undefined, req);
  }

  const symbol = coerceString(payload.symbol)?.toUpperCase();
  if (!symbol) {
    return bad("symbol_required", undefined, req);
  }

  const content = coerceString(payload.content);
  if (!content) {
    return bad("content_required", undefined, req);
  }

  let bias: Bias;
  try {
    bias = normaliseBias(payload.bias);
  } catch (error) {
    logger.warn("Invalid bias provided", { error, bias: payload.bias });
    return bad("invalid_bias", undefined, req);
  }

  let chartUrl: string | null = null;
  try {
    chartUrl = normaliseChartUrl(payload.chart_url ?? payload.chartUrl ?? null);
  } catch (error) {
    logger.warn("Invalid chart URL", { error, chartUrl: payload.chart_url });
    return bad("invalid_chart_url", undefined, req);
  }

  const author = coerceString(payload.author) ?? DEFAULT_AUTHOR;

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("analyst_insights")
      .upsert({
        symbol,
        bias,
        content,
        chart_url: chartUrl,
        author,
      }, { onConflict: "chart_url" })
      .select("id, created_at")
      .maybeSingle();

    if (error) {
      logger.error("Failed to persist analyst insight", error);
      return jsonResponse({ status: "error", message: "database_error" }, {
        status: 500,
      }, req);
    }

    logger.info("Stored analyst insight", {
      id: data?.id,
      symbol,
      bias,
      chart_url: chartUrl,
    });

    return jsonResponse(
      {
        status: "ok",
        id: data?.id ?? null,
        created_at: data?.created_at ?? null,
      },
      { status: 200 },
      req,
    );
  } catch (error) {
    logger.error("Unexpected error inserting analyst insight", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return jsonResponse({ status: "error", message }, { status: 500 }, req);
  }
});

export default handler;
