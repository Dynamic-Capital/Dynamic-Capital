import { createClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

type NumericLike = number | string | null;

type QueryFamilyScore = {
  query_family: string;
  recorded_at: string;
  calls: NumericLike;
  total_time_ms: NumericLike;
  mean_time_ms: NumericLike;
  rows_returned: NumericLike;
  calls_delta: NumericLike;
  total_time_delta: NumericLike;
};

type ScorecardFamily = {
  name: string;
  calls: number;
  totalTimeMs: number;
  meanTimeMs: number;
  rowsReturned: number;
  callsDelta: number | null;
  totalTimeDelta: number | null;
  severity: "critical" | "warning" | "watch";
};

type ScorecardResponse = {
  generatedAt: string;
  totals: {
    calls: number;
    totalTimeMs: number;
  };
  families: ScorecardFamily[];
};

function toNumber(value: NumericLike, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function classifySeverity(
  score: QueryFamilyScore,
): ScorecardFamily["severity"] {
  const totalTime = toNumber(score.total_time_ms);
  const delta = toNumber(score.total_time_delta);

  if (totalTime >= 1_000_000 || delta > 100_000) {
    return "critical";
  }
  if (totalTime >= 50_000 || delta > 25_000) {
    return "warning";
  }
  return "watch";
}

export const handler = registerHandler(async (_req) => {
  const supabase = createClient("service");

  const { data, error } = await supabase
    .rpc<QueryFamilyScore[]>("monitoring_get_query_family_scorecard");

  if (error) {
    return new Response(
      JSON.stringify({
        error: "failed_to_load_scorecard",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const scores: QueryFamilyScore[] = (data ?? []).map((row) => ({
    ...row,
    calls: toNumber(row.calls),
    total_time_ms: toNumber(row.total_time_ms),
    mean_time_ms: toNumber(row.mean_time_ms),
    rows_returned: toNumber(row.rows_returned),
    calls_delta: row.calls_delta === null ? null : toNumber(row.calls_delta),
    total_time_delta: row.total_time_delta === null
      ? null
      : toNumber(row.total_time_delta),
  }));

  const families: ScorecardFamily[] = scores.map((row) => ({
    name: row.query_family,
    calls: toNumber(row.calls),
    totalTimeMs: toNumber(row.total_time_ms),
    meanTimeMs: toNumber(row.mean_time_ms),
    rowsReturned: toNumber(row.rows_returned),
    callsDelta: row.calls_delta === null ? null : toNumber(row.calls_delta),
    totalTimeDelta: row.total_time_delta === null
      ? null
      : toNumber(row.total_time_delta),
    severity: classifySeverity(row),
  }));

  const totals = families.reduce(
    (acc, family) => {
      acc.calls += family.calls;
      acc.totalTimeMs += family.totalTimeMs;
      return acc;
    },
    { calls: 0, totalTimeMs: 0 },
  );

  const payload: ScorecardResponse = {
    generatedAt: new Date().toISOString(),
    totals,
    families: families.sort((a, b) => b.totalTimeMs - a.totalTimeMs),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "max-age=30, stale-while-revalidate=60",
    },
  });
});

export default handler;
