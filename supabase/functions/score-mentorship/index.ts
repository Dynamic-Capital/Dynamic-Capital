import { createClient } from "../_shared/client.ts";
import { maybe } from "../_shared/env.ts";
import {
  bad,
  corsHeaders,
  methodNotAllowed,
  ok,
  oops,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import {
  type EcosystemUser,
  ensureEcosystemUser,
  listVerifiedPayments,
} from "../_shared/ecosystem.ts";

const supabase = createClient("service");

interface ScoreMentorshipRequest {
  userId?: unknown;
  authUserId?: unknown;
  wallet?: unknown;
  email?: unknown;
  role?: unknown;
  dctBalance?: unknown;
  context?: unknown;
  telemetry?: Record<string, unknown> | null;
  overrides?: { score?: unknown } | null;
  rationale?: unknown;
}

interface OracleResult {
  score: number;
  metadata: Record<string, unknown> | null;
  source: string;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTelemetryNumber(
  telemetry: Record<string, unknown> | null | undefined,
  key: string,
  fallback = 0,
): number {
  if (!telemetry) return fallback;
  const raw = telemetry[key];
  if (typeof raw === "number") return raw;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchOracleScore(
  user: EcosystemUser,
  payments: Array<{ amount_ton: number | null }>,
  request: ScoreMentorshipRequest,
): Promise<OracleResult | null> {
  const url = maybe("MENTORSHIP_ORACLE_URL");
  if (!url) return null;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const token = maybe("MENTORSHIP_ORACLE_TOKEN");
  if (token) {
    headers.Authorization = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user,
        payments,
        context: request.context ?? null,
        telemetry: request.telemetry ?? null,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Oracle HTTP ${response.status}: ${text}`);
    }

    const payload = await response.json();
    const rawScore = payload?.score;
    const score = typeof rawScore === "number" ? rawScore : Number(rawScore);
    if (!Number.isFinite(score)) {
      throw new Error("Oracle response missing numeric score");
    }

    return {
      score,
      metadata: payload?.metadata ?? payload ?? null,
      source: payload?.source ?? "oracle",
    };
  } catch (error) {
    console.error("Mentorship oracle request failed", error);
    return null;
  }
}

function computeHeuristicScore(
  user: EcosystemUser,
  payments: Array<{ amount_ton: number | null }>,
  telemetry: Record<string, unknown> | null | undefined,
): { score: number; breakdown: Record<string, number> } {
  const dctBalance = Number(user.dct_balance ?? 0);
  const totalVerifiedTon = payments.reduce((sum, payment) => {
    const amount = Number(payment.amount_ton ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const engagement = normalizeTelemetryNumber(telemetry, "engagement", 0);
  const retention = normalizeTelemetryNumber(telemetry, "retention", 0);
  const mentorFeedback = normalizeTelemetryNumber(
    telemetry,
    "mentor_feedback",
    0,
  );

  const base = 40;
  const balanceScore = clamp(dctBalance * 1.5, 0, 30);
  const paymentScore = clamp(totalVerifiedTon * 12, 0, 35);
  const engagementScore = clamp(engagement * 0.5, 0, 15);
  const retentionScore = clamp(retention * 0.5, 0, 10);
  const feedbackScore = clamp(mentorFeedback * 0.8, 0, 20);

  const heuristic = clamp(
    base + balanceScore + paymentScore + engagementScore + retentionScore +
      feedbackScore,
  );

  return {
    score: heuristic,
    breakdown: {
      base,
      balanceScore,
      paymentScore,
      engagementScore,
      retentionScore,
      feedbackScore,
    },
  };
}

function resolveOverrideScore(request: ScoreMentorshipRequest): number | null {
  if (!request.overrides?.score) return null;
  const parsed = Number(request.overrides.score);
  return Number.isFinite(parsed) ? clamp(parsed) : null;
}

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "score-mentorship", ts: new Date().toISOString() }, req);
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  let body: ScoreMentorshipRequest;
  try {
    body = await req.json() as ScoreMentorshipRequest;
  } catch {
    return bad("INVALID_JSON", null, req);
  }

  try {
    const user = await ensureEcosystemUser(supabase, {
      userId: body.userId as string | undefined,
      authUserId: body.authUserId as string | undefined,
      wallet: body.wallet as string | undefined,
      email: body.email as string | undefined,
      role: body.role as string | undefined,
      dctBalance: body.dctBalance as number | string | undefined,
    });

    const payments = await listVerifiedPayments(supabase, {
      userId: user.id,
      wallet: user.wallet,
    });

    const heuristic = computeHeuristicScore(user, payments, body.telemetry);
    const oracle = await fetchOracleScore(user, payments, body);

    const weight = Number(maybe("MENTORSHIP_ORACLE_WEIGHT")) || 0.7;
    let blendedScore = heuristic.score;
    let scoreSource = "heuristic";
    const metadata: Record<string, unknown> = {
      heuristic: heuristic.breakdown,
      payments: {
        verifiedCount: payments.length,
        totalTon: payments.reduce(
          (sum, row) => sum + Number(row.amount_ton ?? 0),
          0,
        ),
      },
    };

    if (oracle) {
      blendedScore = clamp(
        oracle.score * clamp(weight, 0, 1) +
          heuristic.score * (1 - clamp(weight, 0, 1)),
      );
      scoreSource = oracle.source;
      metadata.oracle = oracle.metadata;
      metadata.weights = {
        oracle: clamp(weight, 0, 1),
        heuristic: 1 - clamp(weight, 0, 1),
      };
    }

    const override = resolveOverrideScore(body);
    if (override !== null) {
      blendedScore = override;
      scoreSource = "override";
      metadata.override = { score: override };
    }

    const rationale = normalizeString(body.rationale ?? body.context);

    const { data: inserted, error } = await supabase
      .from("mentorship_scores")
      .insert({
        user_id: user.id,
        score: blendedScore,
        source: scoreSource,
        rationale: rationale ?? null,
        metadata,
      })
      .select("id, created_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to persist mentorship score", error.message);
      return oops("MENTORSHIP_SCORE_PERSIST_FAILED", error.message, req);
    }

    return ok({
      scoreId: inserted?.id ?? null,
      createdAt: inserted?.created_at ?? new Date().toISOString(),
      score: blendedScore,
      source: scoreSource,
      userId: user.id,
    }, req);
  } catch (error) {
    console.error("score-mentorship error", error);
    return oops(
      "MENTORSHIP_SCORE_FAILED",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});

export default handler;

if (import.meta.main) {
  Deno.serve(handler);
}
