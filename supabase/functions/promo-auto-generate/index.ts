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

interface PromoGenerationRequest {
  force?: boolean;
  preview?: boolean;
}

interface AnalyticsRow {
  date: string;
  new_users: number | null;
  revenue: number | null;
  top_promo_codes: Record<string, number> | null;
}

interface PromoTrigger {
  reason: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  description: string;
  maxUses: number;
  durationDays: number;
}

type AuthorizationResult =
  | { ok: true }
  | { ok: false; reason: "missing-secret" | "invalid-secret" };

function authorize(req: Request): AuthorizationResult {
  const secret = optionalEnv("PROMO_AUTOGEN_SECRET");
  if (!secret) {
    return { ok: false, reason: "missing-secret" };
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    if (header.slice("Bearer ".length).trim() === secret) {
      return { ok: true };
    }
  }

  const apiKey = req.headers.get("x-api-key");
  if (apiKey?.trim() === secret) {
    return { ok: true };
  }

  return { ok: false, reason: "invalid-secret" };
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickTrigger(
  analytics: AnalyticsRow[],
  thresholds: { minUsers: number; minRevenue: number },
): PromoTrigger | null {
  const newUsers = analytics
    .map((row) => parseNumber(row.new_users) ?? 0)
    .filter((value) => value > 0);
  const revenues = analytics
    .map((row) => parseNumber(row.revenue) ?? 0)
    .filter((value) => value > 0);

  const averageUsers = average(newUsers);
  const totalRevenue = revenues.reduce((sum, value) => sum + value, 0);

  if (averageUsers >= thresholds.minUsers) {
    return {
      reason: "new_users_surge",
      discountType: "percentage",
      discountValue: 20,
      description: `Auto promo triggered by ${
        averageUsers.toFixed(1)
      } avg new users`,
      maxUses: 200,
      durationDays: 7,
    };
  }

  if (totalRevenue >= thresholds.minRevenue) {
    return {
      reason: "revenue_milestone",
      discountType: "percentage",
      discountValue: 15,
      description: `Auto promo triggered by $${
        totalRevenue.toFixed(0)
      } revenue in lookback`,
      maxUses: 150,
      durationDays: 5,
    };
  }

  return null;
}

function generateCode(reason: string): string {
  const prefix = reason === "new_users_surge" ? "GROWTH" : "REV";
  const stamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 10);
  return `${prefix}-${stamp}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  const auth = authorize(req);
  if (!auth.ok) {
    if (auth.reason === "missing-secret") {
      console.error(
        "promo-auto-generate: PROMO_AUTOGEN_SECRET is not configured; refusing request.",
      );
      return unauth("Promo generator secret is not configured", req);
    }
    return unauth("Invalid promo generator secret", req);
  }

  let payload: PromoGenerationRequest = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const supabase = createClient("service");
  const lookback = 7;
  const { data: analyticsRows, error: analyticsError } = await supabase
    .from("daily_analytics")
    .select("date,new_users,revenue,top_promo_codes")
    .order("date", { ascending: false })
    .limit(lookback);

  if (analyticsError) {
    console.error("promo-auto-generate: analytics load failed", analyticsError);
    return oops("Unable to load analytics", analyticsError.message, req);
  }

  const analytics = (analyticsRows ?? []) as AnalyticsRow[];
  if (analytics.length === 0) {
    return bad("No analytics data available", null, req);
  }

  const thresholds = {
    minUsers: parseNumber(optionalEnv("PROMO_AUTOGEN_MIN_USERS")) ?? 25,
    minRevenue: parseNumber(optionalEnv("PROMO_AUTOGEN_MIN_REVENUE")) ?? 5000,
  };

  const trigger = pickTrigger(analytics, thresholds);
  if (!trigger && payload.force !== true) {
    return ok({
      ok: false,
      reason: "no_trigger",
      message: "Conditions for auto promo generation not met",
      thresholds,
    }, req);
  }

  const now = new Date();
  const activePromoCheck = await supabase
    .from("promotions")
    .select("id,code,valid_until")
    .eq("auto_created", true)
    .eq("is_active", true)
    .gte("valid_until", now.toISOString())
    .limit(1)
    .maybeSingle();

  if (activePromoCheck.error) {
    console.error(
      "promo-auto-generate: active promo check failed",
      activePromoCheck.error,
    );
    return oops(
      "Unable to verify existing auto promos",
      activePromoCheck.error.message,
      req,
    );
  }

  if (activePromoCheck.data && payload.force !== true) {
    return ok({
      ok: false,
      reason: "promo_active",
      activePromo: activePromoCheck.data,
    }, req);
  }

  const { data: planRow, error: planError } = await supabase
    .from("subscription_plans")
    .select("id,name,price,dynamic_price_usdt")
    .order("price", { ascending: false })
    .limit(1)
    .single();

  if (planError || !planRow) {
    console.error("promo-auto-generate: plan load failed", planError);
    return oops(
      "Unable to determine target plan",
      planError?.message ?? "No plan found",
      req,
    );
  }

  const discount = trigger ?? {
    reason: "manual_force",
    discountType: "percentage",
    discountValue: 10,
    description: "Manual promo trigger",
    maxUses: 100,
    durationDays: 5,
  };

  const code = generateCode(discount.reason);
  const validUntil = addDays(now, discount.durationDays);

  if (payload.preview) {
    return ok({
      preview: true,
      code,
      discount,
      analytics,
      thresholds,
      plan: planRow,
    }, req);
  }

  const insertResult = await supabase.from("promotions").insert({
    code,
    description: discount.description,
    discount_type: discount.discountType === "percentage"
      ? "percentage"
      : "amount",
    discount_value: discount.discountType === "percentage"
      ? discount.discountValue
      : Math.max(discount.discountValue, 1),
    is_active: true,
    max_uses: discount.maxUses,
    current_uses: 0,
    valid_from: now.toISOString(),
    valid_until: validUntil.toISOString(),
    auto_created: true,
    generated_via: discount.reason,
    performance_snapshot: {
      analytics,
      thresholds,
      triggered_at: now.toISOString(),
      plan: planRow,
    },
  });

  if (insertResult.error) {
    console.error("promo-auto-generate: insert failed", insertResult.error);
    return oops("Failed to create promo code", insertResult.error.message, req);
  }

  return ok({
    ok: true,
    code,
    discount,
    plan: planRow,
    valid_until: validUntil.toISOString(),
  }, req);
});

export default handler;
