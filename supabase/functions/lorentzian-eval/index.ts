// Lorentzian Eval Edge Function
// Deploy with: supabase functions deploy lorentzian-eval

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pickle from "https://cdn.skypack.dev/pickleparser";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface LorentzianModel {
  window: number;
  mean: number;
  std: number;
  z_thresh: number;
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

function isLorentzianModel(model: unknown): model is LorentzianModel {
  if (!model || typeof model !== "object") return false;
  const candidate = model as Record<string, unknown>;
  return (
    typeof candidate.window === "number" &&
    typeof candidate.mean === "number" &&
    typeof candidate.std === "number" &&
    typeof candidate.z_thresh === "number"
  );
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
  const modelPath = await getLatestModelPath();
  const { data, error } = await supabase.storage.from("ai-models").download(
    modelPath,
  );

  if (error || !data) {
    throw new Error(
      `Model download failed: ${error?.message ?? "unknown error"}`,
    );
  }

  const buffer = await data.arrayBuffer();
  const parsed = pickle.loads(new Uint8Array(buffer)) as unknown;

  if (!isLorentzianModel(parsed)) {
    throw new Error("Downloaded model has invalid structure");
  }

  return parsed;
}

function evaluateSignal(model: LorentzianModel, prices: number[]) {
  const { window, mean, std, z_thresh } = model;

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
  const confidence = Math.min(Math.abs(z) / safeThreshold, 1);

  return { signal, confidence, score: z };
}

serve(async (req) => {
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
