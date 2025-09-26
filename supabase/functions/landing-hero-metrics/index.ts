import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const LIVE_SIGNAL_WINDOWS = {
  last30Days: 30,
  last90Days: 90,
} as const;
const MENTOR_FEEDBACK_WINDOW_DAYS = 90;
const DEFAULT_LIMIT = 250;

type MentorFeedbackRow = {
  score: number | null;
  submitted_at: string | null;
};

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process?.env?.[key]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  if (typeof Deno !== "undefined") {
    try {
      const value = Deno.env.get(key)?.trim();
      if (value) return value;
    } catch {
      // ignore
    }
  }
  return undefined;
}

function resolveSupabaseRestConfig() {
  const url = readEnv("SUPABASE_URL") ?? readEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    "https://stub.supabase.co";
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY") ??
    readEnv("SUPABASE_SERVICE_ROLE");

  if (!key) {
    throw new Error("Missing Supabase service role key for metrics fetch");
  }

  return { restUrl: `${url.replace(/\/$/, "")}/rest/v1`, serviceKey: key };
}

function parseCount(contentRange: string | null): number {
  if (!contentRange) return 0;
  const parts = contentRange.split("/");
  const total = parts.at(-1);
  const value = Number(total ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function countHeadCount(url: URL): Promise<number> {
  const { serviceKey } = resolveSupabaseRestConfig();
  const response = await fetch(url, {
    method: "HEAD",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "count=exact",
    },
  });

  if (!response.ok) {
    throw new Error(
      `count query failed with status ${response.status} for ${url.pathname}`,
    );
  }

  return parseCount(response.headers.get("content-range"));
}

async function countExecutedSignalsSince(sinceIso: string): Promise<number> {
  const { restUrl } = resolveSupabaseRestConfig();
  const url = new URL(`${restUrl}/signals`);
  url.searchParams.set("select", "id");
  url.searchParams.set("status", "eq.executed");
  url.searchParams.set("executed_at", `gte.${sinceIso}`);

  return countHeadCount(url);
}

async function fetchMentorFeedback(): Promise<
  { rows: MentorFeedbackRow[]; totalCount: number }
> {
  const { restUrl, serviceKey } = resolveSupabaseRestConfig();
  const url = new URL(`${restUrl}/mentor_feedback`);
  url.searchParams.set("select", "score,submitted_at");
  url.searchParams.set("order", "submitted_at.desc");
  url.searchParams.set("limit", String(DEFAULT_LIMIT));

  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "count=exact",
    },
  });

  if (!response.ok) {
    throw new Error(
      `mentor_feedback fetch failed with status ${response.status}`,
    );
  }

  const rows = await response.json() as MentorFeedbackRow[];
  const total = parseCount(response.headers.get("content-range"));
  return { rows, totalCount: total };
}

function isoDaysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_IN_MS).toISOString();
}

function resolveMentorFeedback(
  rows: MentorFeedbackRow[],
  totalCount: number,
  now: Date,
) {
  const windowCutoff = new Date(
    now.getTime() - MENTOR_FEEDBACK_WINDOW_DAYS * DAY_IN_MS,
  );

  const filtered = rows
    .filter((row) => {
      if (!row?.submitted_at) return false;
      const submittedAt = new Date(row.submitted_at);
      return submittedAt >= windowCutoff;
    })
    .sort((a, b) => {
      const aTime = a?.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const bTime = b?.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return bTime - aTime;
    });

  if (filtered.length === 0) {
    return {
      average: null as number | null,
      sampleSize: 0,
      lastSubmissionAt: null as string | null,
      fallback: true,
      windowDays: MENTOR_FEEDBACK_WINDOW_DAYS,
    };
  }

  let sum = 0;
  let actualCount = 0;
  const latest = filtered[0]?.submitted_at ?? null;
  for (const row of filtered) {
    const score = typeof row.score === "number" ? row.score : Number(row.score);
    if (Number.isFinite(score)) {
      sum += score;
      actualCount += 1;
    }
  }

  if (actualCount === 0) {
    return {
      average: null as number | null,
      sampleSize: 0,
      lastSubmissionAt: null as string | null,
      fallback: true,
      windowDays: MENTOR_FEEDBACK_WINDOW_DAYS,
    };
  }

  const average = Number((sum / actualCount).toFixed(2));

  return {
    average,
    sampleSize: Math.min(totalCount, actualCount),
    lastSubmissionAt: latest,
    fallback: false,
    windowDays: MENTOR_FEEDBACK_WINDOW_DAYS,
  };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
    });
  }

  try {
    const now = new Date();

    const tradersPromise = countHeadCount(
      new URL(`${resolveSupabaseRestConfig().restUrl}/bot_users?select=id`),
    );

    const mentorFeedbackPromise = fetchMentorFeedback();

    const [
      tradersResponse,
      liveSignals30,
      liveSignals90,
      mentorFeedbackData,
    ] = await Promise.all([
      tradersPromise,
      countExecutedSignalsSince(
        isoDaysAgo(now, LIVE_SIGNAL_WINDOWS.last30Days),
      ),
      countExecutedSignalsSince(
        isoDaysAgo(now, LIVE_SIGNAL_WINDOWS.last90Days),
      ),
      mentorFeedbackPromise,
    ]);

    const payload = {
      generatedAt: now.toISOString(),
      tradersOnboarded: {
        total: tradersResponse,
      },
      liveSignals: {
        last30Days: liveSignals30,
        last90Days: liveSignals90,
        windows: LIVE_SIGNAL_WINDOWS,
      },
      mentorSatisfaction: resolveMentorFeedback(
        mentorFeedbackData.rows,
        mentorFeedbackData.totalCount,
        now,
      ),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[landing-hero-metrics] Failed to resolve metrics", error);
    return new Response(
      JSON.stringify({ message: "Failed to load hero metrics" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
