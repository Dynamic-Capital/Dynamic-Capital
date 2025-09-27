import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { registerHandler } from "../_shared/serve.ts";
import { bad, jsonResponse, methodNotAllowed } from "../_shared/http.ts";
import { createClient } from "../_shared/client.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

type HedgeSide = "LONG_HEDGE" | "SHORT_HEDGE";
type HedgeReason = "ATR_SPIKE" | "DD_LIMIT" | "NEWS";

type ExposureInput = {
  symbol: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  beta?: number;
  price?: number;
  pipValue?: number;
};

type VolatilitySnapshot = {
  symbol: string;
  atr: number;
  price: number;
  medianRatio: number;
  pipValue?: number;
};

type HedgeRow = {
  id: string;
  symbol: string;
  hedge_symbol: string;
  side: HedgeSide;
  qty: number;
  reason: HedgeReason;
  status: "OPEN" | "CLOSED" | "CANCELLED";
};

type HedgeDecision = {
  action: "OPEN" | "CLOSE";
  symbol: string;
  hedgeSymbol: string;
  side: HedgeSide;
  quantity: number;
  reason: HedgeReason;
  score: number;
  hedgeId?: string;
  notes?: string;
};

type AggregatedExposure = {
  symbol: string;
  net: number;
  gross: number;
  beta: number;
  price?: number;
  pipValue?: number;
};

type NewsEvent = {
  symbol?: string | null;
  minutesUntil: number;
  severity: "low" | "medium" | "high";
};

type HedgeConfig = {
  volatilitySpikeMultiplier: number;
  volatilityRecoveryBuffer: number;
  newsLeadMinutes: number;
  drawdownTriggerR: number;
  maxBasketRiskMultiple: number;
};

const requestSchema = z.object({
  mode: z.enum(["hedging", "netting"]).default("hedging"),
  exposures: z
    .array(
      z.object({
        symbol: z.string(),
        direction: z.enum(["LONG", "SHORT"]),
        quantity: z.number(),
        beta: z.number().optional(),
        price: z.number().optional(),
        pipValue: z.number().optional(),
      }),
    )
    .optional(),
  volatility: z
    .array(
      z.object({
        symbol: z.string(),
        atr: z.number().nonnegative(),
        price: z.number().positive(),
        medianRatio: z.number().positive(),
        pipValue: z.number().positive().optional(),
      }),
    )
    .optional(),
  drawdown: z
    .object({
      openR: z.number().optional(),
      riskCapital: z.number().optional(),
    })
    .optional(),
  correlations: z
    .record(z.string(), z.record(z.string(), z.number()))
    .optional(),
  news: z
    .array(
      z.object({
        symbol: z.string().optional(),
        minutesUntil: z.number().nonnegative(),
        severity: z.enum(["low", "medium", "high"]).default("high"),
      }),
    )
    .optional(),
  config: z
    .object({
      volatilitySpikeMultiplier: z.number().positive().optional(),
      volatilityRecoveryBuffer: z.number().positive().optional(),
      newsLeadMinutes: z.number().positive().optional(),
      drawdownTriggerR: z.number().positive().optional(),
      maxBasketRiskMultiple: z.number().positive().optional(),
    })
    .optional(),
});

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  let payload: z.infer<typeof requestSchema>;
  try {
    payload = requestSchema.parse(await req.json());
  } catch (error) {
    console.error("[dynamic-hedge] invalid request body", error);
    return bad("Invalid request body", undefined, req);
  }

  const supabase = createClient("service");

  const exposures = payload.exposures ??
    (await loadExposuresFromTrades(supabase));
  const volatility = new Map<string, VolatilitySnapshot>(
    (payload.volatility ?? []).map((snapshot) => [snapshot.symbol, snapshot]),
  );
  const correlations = payload.correlations ?? {};
  const news = payload.news ?? [];
  const activeHedges = await loadActiveHedges(supabase);

  const config: HedgeConfig = {
    volatilitySpikeMultiplier: payload.config?.volatilitySpikeMultiplier ?? 1.3,
    volatilityRecoveryBuffer: payload.config?.volatilityRecoveryBuffer ?? 1.05,
    newsLeadMinutes: payload.config?.newsLeadMinutes ?? 60,
    drawdownTriggerR: payload.config?.drawdownTriggerR ?? 2,
    maxBasketRiskMultiple: payload.config?.maxBasketRiskMultiple ?? 1.5,
  };

  const drawdownR = payload.drawdown?.openR ?? 0;
  const riskCapital = payload.drawdown?.riskCapital ?? 0;

  const decisions = evaluateDecisions({
    mode: payload.mode ?? "hedging",
    exposures,
    volatility,
    correlations,
    news,
    activeHedges,
    config,
    drawdownR,
    riskCapital,
  });

  const opens = decisions.filter((decision) => decision.action === "OPEN");
  const closes = decisions.filter((decision) => decision.action === "CLOSE");

  const opened: unknown[] = [];
  for (const decision of opens) {
    const insertPayload = {
      symbol: decision.symbol,
      hedge_symbol: decision.hedgeSymbol,
      side: decision.side,
      qty: Number(decision.quantity.toFixed(6)),
      reason: decision.reason,
      entry_price: volatility.get(decision.symbol)?.price ?? null,
      metadata: {
        score: decision.score,
        notes: decision.notes ?? null,
      },
    };

    const { data, error } = await supabase
      .from("hedge_actions")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[dynamic-hedge] failed to insert hedge action", error);
      continue;
    }

    opened.push(data);

    const { error: signalError } = await supabase.from("signals").insert({
      alert_id: `hedge-${decision.symbol}-${crypto.randomUUID()}`,
      source: "dynamic-hedge",
      symbol: decision.hedgeSymbol,
      direction: decision.side === "SHORT_HEDGE" ? "short" : "long",
      order_type: "market",
      priority: 5,
      payload: {
        reason: decision.reason,
        hedge_symbol: decision.hedgeSymbol,
        quantity: Number(decision.quantity.toFixed(6)),
        score: decision.score,
      },
    });

    if (signalError) {
      console.error("[dynamic-hedge] failed to emit signal", signalError);
    }
  }

  const closed: unknown[] = [];
  for (const decision of closes) {
    if (!decision.hedgeId) continue;
    const updatePayload = {
      status: "CLOSED",
      closed_at: new Date().toISOString(),
      close_price: volatility.get(decision.symbol)?.price ?? null,
      metadata: {
        score: decision.score,
        notes: decision.notes ?? null,
      },
    };

    const { data, error } = await supabase
      .from("hedge_actions")
      .update(updatePayload)
      .eq("id", decision.hedgeId)
      .select()
      .single();

    if (error) {
      console.error("[dynamic-hedge] failed to close hedge", error);
      continue;
    }

    closed.push(data);

    const { error: signalError } = await supabase.from("signals").insert({
      alert_id: `hedge-close-${decision.symbol}-${crypto.randomUUID()}`,
      source: "dynamic-hedge",
      symbol: decision.hedgeSymbol,
      direction: "flat",
      order_type: "market",
      priority: 4,
      payload: {
        reason: decision.reason,
        hedge_symbol: decision.hedgeSymbol,
        quantity: Number(decision.quantity.toFixed(6)),
        action: "CLOSE",
      },
    });

    if (signalError) {
      console.error(
        "[dynamic-hedge] failed to emit closing signal",
        signalError,
      );
    }
  }

  return jsonResponse({
    opened,
    closed,
    summary: {
      requestedOpens: opens.length,
      requestedCloses: closes.length,
    },
  }, { headers: corsHeaders });
});

export default handler;

type EvaluationInput = {
  mode: "hedging" | "netting";
  exposures: ExposureInput[];
  volatility: Map<string, VolatilitySnapshot>;
  correlations: Record<string, Record<string, number>>;
  news: NewsEvent[];
  activeHedges: HedgeRow[];
  config: HedgeConfig;
  drawdownR: number;
  riskCapital: number;
};

function evaluateDecisions(input: EvaluationInput): HedgeDecision[] {
  const {
    mode,
    exposures,
    volatility,
    correlations,
    news,
    activeHedges,
    config,
    drawdownR,
    riskCapital,
  } = input;

  const aggregates = aggregateExposures(exposures);
  const decisions: HedgeDecision[] = [];

  for (const aggregate of aggregates.values()) {
    if (Math.abs(aggregate.net) <= 1e-6) continue;
    const snapshot = volatility.get(aggregate.symbol);
    const trigger = evaluateTriggers({
      symbol: aggregate.symbol,
      snapshot,
      config,
      drawdownR,
      news,
    });

    if (!trigger) continue;
    const { reason, score } = trigger;
    const alreadyActive = activeHedges.some(
      (hedge) =>
        hedge.symbol === aggregate.symbol && hedge.reason === reason &&
        hedge.status === "OPEN",
    );
    if (alreadyActive) continue;

    const hedgeSymbol = mode === "hedging"
      ? aggregate.symbol
      : selectInverseSymbol(aggregate.symbol, correlations);
    const side: HedgeSide = aggregate.net > 0 ? "SHORT_HEDGE" : "LONG_HEDGE";
    const quantity = computeQuantity({
      reason,
      score,
      aggregate,
      snapshot,
      config,
      riskCapital,
    });
    const notes = reason === "NEWS"
      ? describeNewsTiming(news, aggregate.symbol, config.newsLeadMinutes)
      : undefined;

    decisions.push({
      action: "OPEN",
      symbol: aggregate.symbol,
      hedgeSymbol,
      side,
      quantity: Number(quantity.toFixed(6)),
      reason,
      score,
      notes,
    });
  }

  for (const hedge of activeHedges) {
    if (hedge.status !== "OPEN") continue;
    const snapshot = volatility.get(hedge.symbol);
    if (shouldClose({ hedge, snapshot, config, drawdownR, news })) {
      decisions.push({
        action: "CLOSE",
        symbol: hedge.symbol,
        hedgeSymbol: hedge.hedge_symbol,
        side: hedge.side,
        quantity: Number(hedge.qty ?? 0),
        reason: hedge.reason,
        score: 1,
        hedgeId: hedge.id,
      });
    }
  }

  return decisions;
}

type TriggerInput = {
  symbol: string;
  snapshot?: VolatilitySnapshot;
  config: HedgeConfig;
  drawdownR: number;
  news: NewsEvent[];
};

type TriggerResult = { reason: HedgeReason; score: number } | null;

function evaluateTriggers(input: TriggerInput): TriggerResult {
  const { snapshot, config, drawdownR, news, symbol } = input;
  if (snapshot && snapshot.medianRatio > 0) {
    const ratio = snapshot.atr / snapshot.price;
    if (ratio > config.volatilitySpikeMultiplier * snapshot.medianRatio) {
      const volRatio = ratio / snapshot.medianRatio;
      return { reason: "ATR_SPIKE", score: Math.max(volRatio, 1) };
    }
  }

  if (Math.abs(drawdownR) >= config.drawdownTriggerR) {
    return { reason: "DD_LIMIT", score: Math.abs(drawdownR) };
  }

  const newsScores = news
    .filter((event) => newsRelevant(event, symbol, config.newsLeadMinutes))
    .map((event) => newsScore(event, config.newsLeadMinutes));

  if (newsScores.length > 0) {
    return { reason: "NEWS", score: Math.max(...newsScores) };
  }

  return null;
}

type QuantityInput = {
  reason: HedgeReason;
  score: number;
  aggregate: AggregatedExposure;
  snapshot?: VolatilitySnapshot;
  config: HedgeConfig;
  riskCapital: number;
};

function computeQuantity(input: QuantityInput): number {
  const { reason, score, aggregate, snapshot, config, riskCapital } = input;
  const baseExposure = Math.abs(aggregate.net);
  if (baseExposure <= 0) return 0;

  let quantity: number;
  if (reason === "ATR_SPIKE") {
    quantity = baseExposure * aggregate.beta * Math.max(1, score);
  } else if (reason === "DD_LIMIT") {
    const atrValue = snapshot?.atr ?? 1;
    const pipValue = snapshot?.pipValue ?? aggregate.pipValue ?? 1;
    const riskBudget = riskCapital || (aggregate.price ?? 1) * baseExposure;
    quantity = riskBudget / Math.max(atrValue * pipValue, 1e-6);
  } else {
    quantity = baseExposure * Math.max(score, 1);
  }

  const maxMultiple = config.maxBasketRiskMultiple;
  if (maxMultiple > 0) {
    quantity = Math.min(quantity, baseExposure * maxMultiple);
  }

  return quantity;
}

type CloseInput = {
  hedge: HedgeRow;
  snapshot?: VolatilitySnapshot;
  config: HedgeConfig;
  drawdownR: number;
  news: NewsEvent[];
};

function shouldClose(input: CloseInput): boolean {
  const { hedge, snapshot, config, drawdownR, news } = input;
  if (hedge.reason === "ATR_SPIKE") {
    if (!snapshot || snapshot.medianRatio <= 0) return false;
    const ratio = snapshot.atr / snapshot.price;
    return ratio <= config.volatilityRecoveryBuffer * snapshot.medianRatio;
  }
  if (hedge.reason === "DD_LIMIT") {
    return Math.abs(drawdownR) < Math.max(1, config.drawdownTriggerR * 0.5);
  }
  return !news.some((event) =>
    newsRelevant(event, hedge.symbol, config.newsLeadMinutes)
  );
}

function aggregateExposures(
  exposures: ExposureInput[],
): Map<string, AggregatedExposure> {
  const aggregates = new Map<string, AggregatedExposure>();
  const betaWeights = new Map<string, number>();
  const betaTotals = new Map<string, number>();

  for (const exposure of exposures) {
    const qty = Math.abs(exposure.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const direction = exposure.direction === "LONG" ? 1 : -1;
    const existing = aggregates.get(exposure.symbol);
    if (!existing) {
      aggregates.set(exposure.symbol, {
        symbol: exposure.symbol,
        net: direction * qty,
        gross: qty,
        beta: exposure.beta ?? 1,
        price: exposure.price,
        pipValue: exposure.pipValue,
      });
      betaWeights.set(exposure.symbol, qty);
      betaTotals.set(exposure.symbol, qty * (exposure.beta ?? 1));
    } else {
      existing.net += direction * qty;
      existing.gross += qty;
      if (exposure.price !== undefined) existing.price = exposure.price;
      if (exposure.pipValue !== undefined) {
        existing.pipValue = exposure.pipValue;
      }
      betaWeights.set(
        exposure.symbol,
        (betaWeights.get(exposure.symbol) ?? 0) + qty,
      );
      betaTotals.set(
        exposure.symbol,
        (betaTotals.get(exposure.symbol) ?? 0) + qty * (exposure.beta ?? 1),
      );
    }
  }

  for (const [symbol, aggregate] of aggregates.entries()) {
    const weight = betaWeights.get(symbol) ?? 0;
    aggregate.beta = weight > 0 ? (betaTotals.get(symbol) ?? 0) / weight : 1;
  }

  return aggregates;
}

function selectInverseSymbol(
  symbol: string,
  correlations: Record<string, Record<string, number>>,
): string {
  const row = correlations[symbol] ?? {};
  let bestSymbol = symbol;
  let bestValue = 1;
  for (const [candidate, value] of Object.entries(row)) {
    if (typeof value !== "number") continue;
    if (value < bestValue) {
      bestValue = value;
      bestSymbol = candidate;
    }
  }
  return bestValue <= -0.6 ? bestSymbol : symbol;
}

function newsRelevant(
  event: NewsEvent,
  symbol: string,
  horizon: number,
): boolean {
  if (event.minutesUntil < 0 || event.minutesUntil > horizon) return false;
  if (!event.symbol) return true;
  const normalized = event.symbol.toUpperCase();
  return normalized === symbol.toUpperCase() || normalized === "GLOBAL" ||
    normalized === "ALL";
}

function newsScore(event: NewsEvent, horizon: number): number {
  const base = event.severity === "high"
    ? 1.3
    : event.severity === "medium"
    ? 1
    : 0.6;
  const timeFactor = Math.max(
    0.5,
    (horizon - event.minutesUntil) / Math.max(horizon, 1),
  );
  return Math.max(0.5, base * timeFactor);
}

function describeNewsTiming(
  news: NewsEvent[],
  symbol: string,
  horizon: number,
): string | undefined {
  const times = news
    .filter((event) => newsRelevant(event, symbol, horizon))
    .map((event) => event.minutesUntil);
  if (times.length === 0) return undefined;
  const min = Math.min(...times);
  return `${Math.round(min)}m to high impact news`;
}

type SupabaseLike = ReturnType<typeof createClient>;

async function loadExposuresFromTrades(
  supabase: SupabaseLike,
): Promise<ExposureInput[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("symbol,direction,volume,status,closed_at");
  if (error) {
    console.error("[dynamic-hedge] failed to load trades", error);
    return [];
  }
  return (data ?? [])
    .filter((row: any) => !row.closed_at)
    .map((row: any) => ({
      symbol: String(row.symbol ?? ""),
      direction: String(row.direction ?? "long").toUpperCase() === "SHORT"
        ? "SHORT"
        : "LONG",
      quantity: Number(row.volume ?? 0) || 0,
    }))
    .filter((row) => row.quantity > 0);
}

async function loadActiveHedges(supabase: SupabaseLike): Promise<HedgeRow[]> {
  const { data, error } = await supabase
    .from("hedge_actions")
    .select("id,symbol,hedge_symbol,side,qty,reason,status")
    .eq("status", "OPEN");
  if (error) {
    console.error("[dynamic-hedge] failed to load hedges", error);
    return [];
  }
  return data ?? [];
}
