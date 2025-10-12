import { createClient } from "../_shared/client.ts";
import {
  bad,
  corsHeaders,
  methodNotAllowed,
  ok,
  oops,
  unauth,
} from "../_shared/http.ts";
import { optionalEnv } from "../_shared/env.ts";
import { registerHandler } from "../_shared/serve.ts";
import { setConfig } from "../_shared/config.ts";
import {
  buildPricingBlueprint,
  type PricingBlueprint,
} from "../_shared/service-pricing.ts";
import {
  calculateDctAmount,
  calculateTonAmount,
  diffPercent,
  fetchTonUsdRate,
  resolveDisplayPrice,
  type TonRateResult,
} from "../_shared/pricing.ts";

interface PricingRequestBody {
  planIds?: string[];
  preview?: boolean;
}

interface TradeRow {
  status: string | null;
  opened_at: string | null;
  closed_at: string | null;
  execution_payload: Record<string, unknown> | null;
}

interface TradeMetrics {
  total: number;
  wins: number;
  losses: number;
  cancellations: number;
  winRate: number | null;
  recentWinRate: number | null;
  lookbackDays: number;
  recentDays: number;
  averageHoldMinutes: number | null;
  sampleSize: number;
}

interface PlanRow {
  id: string;
  name: string;
  price: number;
  currency: string;
  dynamic_price_usdt: number | null;
  pricing_formula: string | null;
  last_priced_at: string | null;
  performance_snapshot: Record<string, unknown> | null;
}

interface ProcessedPlan {
  plan_id: string;
  plan_name: string;
  base_price: number;
  dynamic_price: number;
  display_price: number;
  dynamic_applied: boolean;
  ton_amount: number | null;
  dct_amount: number | null;
  previous_dynamic_price: number | null;
  adjustments: Record<string, number>;
  pricing_formula: string;
  snapshot: Record<string, unknown>;
}

interface EducationPackageRow {
  id: string;
  name: string;
  price: number;
  currency: string | null;
  duration_weeks: number | null;
  is_lifetime: boolean | null;
}

interface EducationPackagePricing {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_weeks: number | null;
  is_lifetime: boolean;
  ton_amount: number | null;
  dct_amount: number;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function detectOutcome(trade: TradeRow): "win" | "loss" | "cancel" | "unknown" {
  const status = (trade.status ?? "").toLowerCase();
  if (status === "failed") return "loss";
  if (status === "cancelled") return "cancel";

  const payload = trade.execution_payload ?? {};
  const strings = [payload["outcome"], payload["result"], payload["status"]]
    .filter((value): value is string => typeof value === "string")
    .map((v) => v.toLowerCase());

  if (strings.some((v) => v.includes("win") || v.includes("profit"))) {
    return "win";
  }
  if (strings.some((v) => v.includes("loss") || v.includes("stop"))) {
    return "loss";
  }

  const pnlFields = [
    payload["pnl"],
    payload["pnl_usd"],
    payload["profit"],
    payload["net_profit"],
    payload["profit_usd"],
    payload["pnl_percent"],
  ];

  for (const candidate of pnlFields) {
    const numeric = parseNumber(candidate);
    if (numeric === null) continue;
    if (numeric > 0) return "win";
    if (numeric < 0) return "loss";
  }

  if (status === "filled") return "win";
  if (status === "partial_fill" || status === "executing") return "unknown";

  return "unknown";
}

function averageHoldingMinutes(trades: TradeRow[]): number | null {
  const durations: number[] = [];
  for (const trade of trades) {
    if (!trade.opened_at || !trade.closed_at) continue;
    const opened = Date.parse(trade.opened_at);
    const closed = Date.parse(trade.closed_at);
    if (!Number.isFinite(opened) || !Number.isFinite(closed)) continue;
    const diffMs = closed - opened;
    if (diffMs <= 0) continue;
    durations.push(diffMs / 60000);
  }
  if (durations.length === 0) return null;
  const sum = durations.reduce((acc, value) => acc + value, 0);
  return Number((sum / durations.length).toFixed(2));
}

async function computeTradeMetrics(
  lookbackDays: number,
): Promise<TradeMetrics> {
  const supabase = createClient("service");
  const now = new Date();
  const start = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const recentDays = Math.min(lookbackDays, 7);
  const recentStart = new Date(
    now.getTime() - recentDays * 24 * 60 * 60 * 1000,
  );

  const { data, error } = await supabase
    .from("trades")
    .select("status,opened_at,closed_at,execution_payload")
    .gte("opened_at", start.toISOString())
    .order("opened_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const trades = (data ?? []) as TradeRow[];
  const total = trades.length;
  let wins = 0;
  let losses = 0;
  let cancellations = 0;

  const recentTrades: TradeRow[] = [];
  for (const trade of trades) {
    const outcome = detectOutcome(trade);
    if (outcome === "win") wins++;
    else if (outcome === "loss") losses++;
    else if (outcome === "cancel") cancellations++;

    if (
      trade.opened_at && Date.parse(trade.opened_at) >= recentStart.getTime()
    ) {
      recentTrades.push(trade);
    }
  }

  const winRate = total > 0 ? Number(((wins / total) * 100).toFixed(2)) : null;
  const recentWinRate = recentTrades.length > 0
    ? Number((
      (recentTrades.filter((trade) => detectOutcome(trade) === "win").length /
        recentTrades.length) * 100
    ).toFixed(2))
    : null;

  return {
    total,
    wins,
    losses,
    cancellations,
    winRate,
    recentWinRate,
    lookbackDays,
    recentDays,
    averageHoldMinutes: averageHoldingMinutes(trades),
    sampleSize: trades.length,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
}

function normalise(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function extractTonRate(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const tonRate = (snapshot as { tonRate?: unknown }).tonRate;
  if (!tonRate || typeof tonRate !== "object") {
    return null;
  }
  return parseNumber((tonRate as { rate?: unknown }).rate ?? null);
}

function computeReliabilityMultiplier(sampleSize: number): number {
  if (sampleSize <= 0) {
    return 0.25;
  }
  const normalized = Math.log10(sampleSize + 1) / Math.log10(5000 + 1);
  return Number(clamp(normalized, 0.25, 1).toFixed(3));
}

function computeConsistencyAdjustment(
  sampleSize: number,
  averageHoldMinutes: number | null,
): number {
  const sampleComponent = sampleSize < 75
    ? clamp(-((75 - sampleSize) / 75) * 0.08, -0.08, 0)
    : clamp(Math.log1p(sampleSize - 75) * 0.004, 0, 0.05);
  const holdComponent = averageHoldMinutes === null
    ? 0
    : clamp(((120 - averageHoldMinutes) / 120) * 0.03, -0.04, 0.04);
  return clamp(sampleComponent + holdComponent, -0.09, 0.07);
}

function computeMarketDriftAdjustment(
  currentRate: number | null,
  previousRate: number | null,
): number {
  if (!currentRate || currentRate <= 0 || !previousRate || previousRate <= 0) {
    return 0;
  }
  const delta = diffPercent(currentRate, previousRate);
  if (delta === null) {
    return 0;
  }
  return clamp(-(delta / 100) * 0.5, -0.06, 0.06);
}

function buildFormulaSummary(adjustments: Record<string, number>): string {
  const parts = Object.entries(adjustments)
    .map(([label, value]) =>
      `${label}:${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`
    );
  return parts.join(" | ");
}

function authorize(req: Request): boolean {
  const secret = optionalEnv("VIP_PRICING_SECRET");
  if (!secret) return true;
  const authHeader = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim() === secret;
  }
  if (apiKey) {
    return apiKey.trim() === secret;
  }
  return false;
}

async function processPlans(
  plans: PlanRow[],
  metrics: TradeMetrics,
  preview: boolean,
): Promise<{ results: ProcessedPlan[]; tonRate: TonRateResult }> {
  const supabase = createClient("service");
  const tonRate = await fetchTonUsdRate();
  const results: ProcessedPlan[] = [];
  const planUpdates: {
    id: string;
    dynamic_price_usdt: number;
    pricing_formula: string;
    last_priced_at: string;
    performance_snapshot: Record<string, unknown>;
  }[] = [];
  const nowIso = new Date().toISOString();

  for (const plan of plans) {
    const basePrice = Number(plan.price ?? 0);
    const previousDynamic = plan.dynamic_price_usdt
      ? Number(plan.dynamic_price_usdt)
      : null;
    const previousTonRate = extractTonRate(plan.performance_snapshot);
    const reliabilityMultiplier = computeReliabilityMultiplier(
      metrics.sampleSize,
    );

    const winRateAdjBase = metrics.winRate !== null
      ? clamp((metrics.winRate / 100 - 0.55) * 0.6, -0.2, 0.25)
      : 0;
    const winRateAdj = Number(
      (winRateAdjBase * reliabilityMultiplier).toFixed(4),
    );
    const momentumAdjBase =
      metrics.recentWinRate !== null && metrics.winRate !== null
        ? clamp(
          ((metrics.recentWinRate - metrics.winRate) / 100) * 0.4,
          -0.1,
          0.12,
        )
        : 0;
    const momentumAdj = Number(
      (momentumAdjBase * reliabilityMultiplier).toFixed(4),
    );
    const volumeAdj = clamp(Math.log1p(metrics.total) * 0.01, 0, 0.1);
    const cancellationPenalty = metrics.cancellations > 0
      ? clamp(
        -(metrics.cancellations / Math.max(metrics.total, 1)) * 0.1,
        -0.1,
        0,
      )
      : 0;
    const marketAdj = computeMarketDriftAdjustment(
      tonRate.rate,
      previousTonRate,
    );
    const consistencyAdj = computeConsistencyAdjustment(
      metrics.sampleSize,
      metrics.averageHoldMinutes,
    );

    const adjustments = {
      winRate: winRateAdj,
      momentum: momentumAdj,
      activity: volumeAdj,
      cancellations: cancellationPenalty,
      market: marketAdj,
      consistency: consistencyAdj,
    };

    const totalAdj = clamp(
      Object.values(adjustments).reduce((acc, value) => acc + value, 0),
      -0.3,
      0.4,
    );
    const dynamicPrice = Number((basePrice * (1 + totalAdj)).toFixed(2));
    const { price: displayPrice, dynamicApplied } = resolveDisplayPrice(
      basePrice,
      dynamicPrice,
    );
    const tonAmount = calculateTonAmount(displayPrice, tonRate.rate);
    const dctAmount = calculateDctAmount(displayPrice);

    const marketDeltaPct = tonRate.rate && previousTonRate
      ? diffPercent(tonRate.rate, previousTonRate)
      : null;

    const pricingFormula = buildFormulaSummary(adjustments);

    const snapshot = {
      metrics,
      adjustments,
      tonRate,
      computed_at: nowIso,
      base_price: basePrice,
      dynamic_price: dynamicPrice,
      previous_dynamic_price: previousDynamic,
      display_price: displayPrice,
      dynamic_applied: dynamicApplied,
      ton_amount: tonAmount,
      dct_amount: dctAmount,
      delta_pct: diffPercent(displayPrice, previousDynamic),
      market_drift_pct: marketDeltaPct,
      reliability_multiplier: reliabilityMultiplier,
    };

    if (!preview) {
      planUpdates.push({
        id: plan.id,
        dynamic_price_usdt: dynamicPrice,
        pricing_formula: pricingFormula,
        last_priced_at: nowIso,
        performance_snapshot: snapshot,
      });
    }

    results.push({
      plan_id: plan.id,
      plan_name: plan.name,
      base_price: basePrice,
      dynamic_price: dynamicPrice,
      display_price: displayPrice,
      dynamic_applied: dynamicApplied,
      ton_amount: tonAmount,
      dct_amount: dctAmount,
      previous_dynamic_price: previousDynamic,
      adjustments,
      pricing_formula: pricingFormula,
      snapshot,
    });
  }

  if (!preview && planUpdates.length > 0) {
    const { error } = await supabase
      .from("subscription_plans")
      .upsert(planUpdates, { onConflict: "id" });

    if (error) {
      throw new Error(error.message);
    }
  }

  return { results, tonRate };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  if (!authorize(req)) {
    return unauth("Invalid pricing secret", req);
  }

  let payload: PricingRequestBody = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const lookbackEnv = optionalEnv("VIP_PRICING_LOOKBACK_DAYS");
  const lookbackDays = lookbackEnv ? Math.max(7, Number(lookbackEnv)) : 30;
  const metricsPromise = computeTradeMetrics(
    Number.isFinite(lookbackDays) ? lookbackDays : 30,
  );

  const supabase = createClient("service");
  const planFields = [
    "id",
    "name",
    "price",
    "currency",
    "dynamic_price_usdt",
    "pricing_formula",
    "last_priced_at",
    "performance_snapshot",
  ].join(",");

  let query = supabase
    .from("subscription_plans")
    .select(planFields)
    .order("price", { ascending: true });

  if (Array.isArray(payload.planIds) && payload.planIds.length > 0) {
    query = query.in("id", payload.planIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("vip-dynamic-pricing: failed to load plans", error);
    await metricsPromise.catch(() => null);
    return oops("Failed to load subscription plans", error.message, req);
  }

  const plans = (data ?? []) as PlanRow[];
  if (plans.length === 0) {
    const metrics = await metricsPromise;
    return bad("No subscription plans found", { metrics }, req);
  }

  try {
    const metrics = await metricsPromise;
    const { results, tonRate } = await processPlans(
      plans,
      metrics,
      payload.preview === true,
    );
    const displayPrices = results
      .map((plan) => Number(plan.display_price))
      .filter((value) => Number.isFinite(value) && value > 0);

    const fallbackBasePrice = displayPrices[0] ??
      (plans.length > 0 ? Number(plans[0].price ?? 0) : 1200);
    const averageDisplayPrice = average(displayPrices) ??
      (Number.isFinite(fallbackBasePrice) && fallbackBasePrice > 0
        ? fallbackBasePrice
        : 1200);
    const highestDisplayPrice = displayPrices.length > 0
      ? Math.max(...displayPrices)
      : averageDisplayPrice;

    const reliabilityMultiplier = computeReliabilityMultiplier(
      metrics.sampleSize,
    );
    const mentorExperienceScore = normalise(reliabilityMultiplier, 0.25, 1);
    const loyaltyScore = metrics.total > 0
      ? clamp(
        (metrics.total - metrics.cancellations) /
          Math.max(metrics.total, 1),
        0,
        1,
      )
      : 0.6;
    const churnRisk = metrics.total > 0
      ? clamp(metrics.losses / Math.max(metrics.total, 1), 0, 1)
      : 0.2;
    const demandIndex = metrics.winRate !== null
      ? clamp((metrics.winRate - 55) / 10, -1, 2)
      : 0;
    const momentumDelta = metrics.recentWinRate !== null &&
        metrics.winRate !== null
      ? metrics.recentWinRate - metrics.winRate
      : 0;
    const averageMomentum = results.length > 0
      ? results.reduce(
        (acc, plan) => acc + plan.adjustments.momentum,
        0,
      ) / results.length
      : 0;
    const urgencyIndex = clamp(0.5 + averageMomentum * 4, 0, 1);
    const inventoryPressure = metrics.total > 0
      ? clamp(
        metrics.cancellations / Math.max(metrics.total, 1) +
          Math.max(0, -averageMomentum) * 2,
        0,
        1,
      )
      : 0.2;

    const sessionsPerWeek = Math.max(
      2,
      Math.min(
        4,
        Math.round(
          2 + clamp(
            metrics.total / Math.max(metrics.lookbackDays * 40, 1),
            0,
            2,
          ),
        ),
      ),
    );
    const programWeeks = metrics.lookbackDays >= 35 ? 5 : 4;

    const baseSessionRate = Math.max(
      150,
      Number(
        (
          (averageDisplayPrice /
            Math.max(programWeeks * sessionsPerWeek, 1)) *
          (0.75 + mentorExperienceScore * 0.35)
        ).toFixed(2),
      ),
    );

    const holdComponent = metrics.averageHoldMinutes !== null
      ? clamp((120 - metrics.averageHoldMinutes) / 120, -0.5, 0.5)
      : 0;
    const volumeComponent = clamp(metrics.total / 250, 0, 1) * 0.2;
    const menteeIntensity = clamp(
      0.5 + momentumDelta / 20 + holdComponent / 2 + volumeComponent,
      0,
      1,
    );

    const mentorshipTiers = Math.min(4, Math.max(2, results.length || 2));
    const promoCount = Math.max(2, Math.min(4, results.length || 3));

    let pricingBlueprint: PricingBlueprint | null = null;
    const blueprintSeed = payload.preview === true
      ? undefined
      : Math.floor(Date.now() / (60 * 60 * 1000));

    try {
      pricingBlueprint = buildPricingBlueprint({
        seed: blueprintSeed,
        vip: {
          basePrice: fallbackBasePrice > 0
            ? fallbackBasePrice
            : averageDisplayPrice,
          tiers: Math.max(1, results.length || plans.length),
          demandIndex,
          loyaltyScore,
          churnRisk,
        },
        mentorship: {
          baseSessionRate,
          programWeeks,
          sessionsPerWeek,
          mentorExperience: mentorExperienceScore,
          menteeIntensity,
          loyaltyScore,
          tiers: mentorshipTiers,
        },
        promo: {
          basePrice: highestDisplayPrice > 0
            ? highestDisplayPrice
            : averageDisplayPrice,
          urgencyIndex,
          loyaltyScore,
          inventoryPressure,
          count: promoCount,
        },
      });
    } catch (blueprintError) {
      console.error(
        "vip-dynamic-pricing: failed to build pricing blueprint",
        blueprintError,
      );
      pricingBlueprint = null;
    }

    let educationPackages: EducationPackagePricing[] = [];
    try {
      const { data: educationData, error: educationError } = await supabase
        .from("education_packages")
        .select(
          "id,name,price,currency,duration_weeks,is_lifetime",
        )
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (!educationError && Array.isArray(educationData)) {
        educationPackages = (educationData as EducationPackageRow[]).map(
          (pkg) => {
            const rawPrice = Number(pkg.price ?? 0);
            const safePrice = Number.isFinite(rawPrice) && rawPrice > 0
              ? Number(rawPrice.toFixed(2))
              : 0;
            const currency = typeof pkg.currency === "string" &&
                pkg.currency.trim().length > 0
              ? pkg.currency.trim()
              : "USD";
            return {
              id: pkg.id,
              name: pkg.name,
              price: safePrice,
              currency,
              duration_weeks: pkg.duration_weeks,
              is_lifetime: Boolean(pkg.is_lifetime),
              ton_amount: safePrice > 0
                ? calculateTonAmount(safePrice, tonRate.rate)
                : null,
              dct_amount: calculateDctAmount(safePrice),
            };
          },
        );
      }
    } catch (educationError) {
      console.warn(
        "vip-dynamic-pricing: failed to load education packages",
        educationError,
      );
    }

    const computedAt = new Date().toISOString();

    if (pricingBlueprint && payload.preview !== true) {
      await setConfig("pricing:service-blueprint", {
        computed_at: computedAt,
        data: pricingBlueprint,
      }).catch((err) => {
        console.warn(
          "vip-dynamic-pricing: failed to persist pricing blueprint",
          err,
        );
      });
    }

    return ok({
      metrics,
      tonRate,
      updated: payload.preview ? false : true,
      preview: payload.preview === true,
      plans: results,
      service_pricing: {
        blueprint: pricingBlueprint,
        computed_at: computedAt,
        education_packages: educationPackages,
      },
    }, req);
  } catch (error) {
    console.error("vip-dynamic-pricing: failed to compute", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return oops("Failed to compute dynamic pricing", message, req);
  }
});

export default handler;
