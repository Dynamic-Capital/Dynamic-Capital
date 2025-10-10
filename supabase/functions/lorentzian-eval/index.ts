// Lorentzian Eval Edge Function
// Deploy with: supabase functions deploy lorentzian-eval --allow-import

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Removed problematic pickle import - function disabled until proper parser available

import {
  assignStops,
  computeVolatility,
  deriveFibonacciAnchors,
} from "../_shared/sl_tp.ts";
import { registerHandler } from "../_shared/serve.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface LorentzianModel {
  window: number;
  mean: number;
  std: number;
  z_thresh: number;
  sensitivity: number;
  alpha: number;
}

interface EvalRequestBody {
  symbol?: unknown;
  prices?: unknown;
}

interface EvalResponse {
  symbol: string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  score: number;
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function lorentzianDistance(x: number[], y: number[]) {
  return x.reduce(
    (acc, value, index) => acc + Math.log(1 + Math.abs(value - y[index])),
    0,
  );
}

function parseSymbol(symbol: unknown): string | null {
  return typeof symbol === "string" && symbol.trim().length > 0
    ? symbol.trim()
    : null;
}

function parsePrices(prices: unknown): number[] {
  if (!Array.isArray(prices)) return [];

  const parsed = prices
    .map((value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim().length > 0) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      }
      return null;
    })
    .filter((value): value is number =>
      typeof value === "number" && Number.isFinite(value)
    );

  return parsed;
}

function normaliseModel(model: unknown): LorentzianModel {
  if (!model || typeof model !== "object") {
    throw new Error("Downloaded model has invalid structure");
  }

  const candidate = model as Record<string, unknown>;

  const window = Number(candidate.window ?? 0);
  const mean = Number(candidate.mean ?? 0);
  const std = Number(candidate.std ?? 0);
  const zThresh = Number(candidate.z_thresh ?? 0);
  const alpha = Number(candidate.alpha ?? 0);

  if (
    !Number.isFinite(window) ||
    !Number.isFinite(mean) ||
    !Number.isFinite(std) ||
    !Number.isFinite(zThresh)
  ) {
    throw new Error("Lorentzian model contains non-numeric parameters");
  }

  const rawSensitivity = Number(candidate.sensitivity ?? NaN);
  const fallback = Math.abs(mean + Math.abs(zThresh) * std) || 1e-9;
  const sensitivity = Number.isFinite(rawSensitivity) && rawSensitivity > 0
    ? rawSensitivity
    : fallback;

  return {
    window: Math.max(Math.floor(window), 1),
    mean,
    std,
    z_thresh: zThresh,
    sensitivity,
    alpha: Number.isFinite(alpha) ? alpha : 0,
  };
}

async function getLatestModelPath(): Promise<string> {
  const { data, error } = await supabase.storage.from("ai-models").list("", {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw new Error(`Failed to list models: ${error.message}`);
  }

  if (!data) {
    throw new Error("Model listing returned no data");
  }

  const latest = data.reduce<{ name: string; version: number } | null>(
    (acc, item) => {
      if (!item.name) return acc;
      const match = item.name.match(/lorentzian_v(\d+)\.pkl$/i);
      if (!match) return acc;

      const version = Number.parseInt(match[1], 10);
      if (!Number.isFinite(version)) return acc;

      if (!acc || version > acc.version) {
        return { name: item.name, version };
      }

      return acc;
    },
    null,
  );

  if (!latest) {
    throw new Error("No Lorentzian model found in storage");
  }

  return latest.name;
}

async function loadModel(): Promise<LorentzianModel> {
  throw new Error(
    "Model loading temporarily disabled - pickle parser requires --allow-import flag. Deploy with: supabase functions deploy lorentzian-eval --allow-import",
  );
}

function evaluateSignal(model: LorentzianModel, prices: number[]) {
  const { window, mean, std, z_thresh, sensitivity } = model;

  if (prices.length < window) {
    throw new Error(`Not enough price history; need at least ${window} points`);
  }

  const referenceWindow = prices.slice(0, window);
  const currentWindow = prices.slice(prices.length - window);

  const distance = lorentzianDistance(currentWindow, referenceWindow);
  const z = (distance - mean) / (std + 1e-9);

  let signal: EvalResponse["signal"] = "NEUTRAL";
  if (z_thresh > 0) {
    if (z > z_thresh) signal = "SELL";
    else if (z < -z_thresh) signal = "BUY";
  }

  const safeThreshold = Math.max(Math.abs(z_thresh), 1e-9);
  const zConfidence = Math.min(Math.abs(z) / safeThreshold, 1);
  const deviation = Math.abs(distance - mean);
  const calibrated = Math.min(deviation / (Math.abs(sensitivity) + 1e-9), 1);
  const confidence = Math.max(zConfidence, calibrated);

  return { signal, confidence, score: z };
}

export const handler = registerHandler(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = (await req.json()) as EvalRequestBody;
    const symbol = parseSymbol(body.symbol);
    const prices = parsePrices(body.prices);

    if (!symbol || prices.length < 10) {
      return jsonResponse({ error: "Invalid input" }, 400);
    }

    const model = await loadModel();
    const { signal, confidence, score } = evaluateSignal(model, prices);

    const entryPrice = prices[prices.length - 1];
    let sl: number | null = null;
    let tp: number | null = null;

    if (signal !== "NEUTRAL") {
      const volatility = computeVolatility(prices);
      const { retracement, extension } = deriveFibonacciAnchors(prices, signal);
      const treasuryHealth = 1.0; // TODO: hydrate from treasury telemetry when available.
      const { sl: computedSl, tp: computedTp } = assignStops({
        entry: entryPrice,
        side: signal,
        volatility,
        fibonacciRetracement: retracement,
        fibonacciExtension: extension,
        rr: 2,
        treasuryHealth,
      });

      sl = computedSl;
      tp = computedTp;

      const { error: tradeError } = await supabase.from("trades").insert({
        symbol,
        side: signal,
        qty: 1,
        price: entryPrice,
        sl,
        tp,
        pnl: null,
        source: "Lorentzian",
      });

      if (tradeError) {
        console.error("[lorentzian-eval] Failed to log trade", tradeError);
      }
    }

    const { error: insertError } = await supabase.from("signals").insert({
      source: "Lorentzian",
      symbol,
      signal,
      confidence,
      lobe: "lorentzian",
      score,
    });

    if (insertError) {
      console.error("[lorentzian-eval] Failed to log signal", insertError);
    }

    const response: EvalResponse = {
      symbol,
      signal,
      confidence,
      score,
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[lorentzian-eval] ERROR:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

export default handler;
